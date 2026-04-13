import { getServiceClient } from "@/lib/supabase/service";
import { OUTCOME_CODES, type OutcomeCode } from "./outcomes";
import { ruleBasedClassify } from "./rule-based-fallback";
import { decideRetry } from "./retry-policy";
import { buildProviderCtx, loadSourceById } from "./context";

const MIN_CONFIDENCE = 0.4;
const CAPTURED_FIELD_CONFIDENCE = 0.7;

interface ClassifierResult {
  outcome_code: OutcomeCode;
  sentiment: "positive" | "neutral" | "negative";
  captured_fields: Record<string, any>;
  summary: string;
  follow_up_at: string | null;
  confidence: number;
  model: string;
}

async function runLLMClassifier(
  transcript: string,
  durationSecs: number,
  apiKey: string | null
): Promise<ClassifierResult | null> {
  if (!apiKey) return null;
  const sys = `You analyze call transcripts between an outbound voice agent and a lead. Output JSON ONLY with this schema:
{
  "outcome_code": "${OUTCOME_CODES.join("|")}",
  "sentiment": "positive|neutral|negative",
  "captured_fields": { ... any structured data the lead volunteered ... },
  "summary": "<= 2 sentences",
  "follow_up_at": "ISO-8601 string or null",
  "confidence": 0.0-1.0
}`;
  const user = `Call duration: ${durationSecs}s.\nTranscript:\n${transcript.slice(0, 12000)}`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!OUTCOME_CODES.includes(parsed.outcome_code)) return null;
    return {
      outcome_code: parsed.outcome_code,
      sentiment: parsed.sentiment ?? "neutral",
      captured_fields: parsed.captured_fields ?? {},
      summary: parsed.summary ?? "",
      follow_up_at: parsed.follow_up_at ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      model: "gpt-4o-mini",
    };
  } catch {
    return null;
  }
}

export async function classifyAndWriteback(callId: string): Promise<{ ok: boolean; error?: string }> {
  const svc = getServiceClient();

  const { data: call, error: callErr } = await svc
    .from("calls")
    .select("id, user_id, lead_id, duration_secs, ended_at")
    .eq("id", callId)
    .maybeSingle();
  if (callErr || !call) return { ok: false, error: "call not found" };

  const { data: transcripts } = await svc
    .from("transcripts")
    .select("speaker, text")
    .eq("call_id", callId)
    .order("timestamp_ms", { ascending: true });

  const flat = (transcripts ?? [])
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  let apiKey: string | null = null;
  if (call.user_id) {
    const { data: settings } = await svc
      .from("user_settings")
      .select("settings")
      .eq("user_id", call.user_id)
      .maybeSingle();
    apiKey = (settings?.settings?.openai_api_key as string) || null;
  }

  let result = await runLLMClassifier(flat, call.duration_secs || 0, apiKey);
  let classifierModel = result?.model ?? "rules";
  if (!result || result.confidence < MIN_CONFIDENCE) {
    const rb = ruleBasedClassify(flat, call.duration_secs || 0);
    result = {
      outcome_code: rb.outcome,
      sentiment: rb.sentiment,
      captured_fields: {},
      summary: rb.summary,
      follow_up_at: null,
      confidence: rb.confidence,
      model: "rules",
    };
    classifierModel = "rules";
  }

  const capturedForWriteback =
    result.confidence >= CAPTURED_FIELD_CONFIDENCE ? result.captured_fields : {};

  await svc.from("call_outcomes").upsert(
    {
      call_id: callId,
      lead_id: call.lead_id,
      outcome_code: result.outcome_code,
      sentiment: result.sentiment,
      captured_fields: result.captured_fields,
      summary: result.summary,
      follow_up_at: result.follow_up_at,
      classifier_model: classifierModel,
      classifier_confidence: result.confidence,
      writeback_status: call.lead_id ? "pending" : "skipped",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "call_id" }
  );

  await svc.from("calls").update({ outcome_code: result.outcome_code }).eq("id", callId);

  if (call.lead_id) {
    const { data: lead } = await svc
      .from("leads")
      .select("id, lead_source_id, attempts, max_attempts")
      .eq("id", call.lead_id)
      .maybeSingle();
    if (lead) {
      const decision = decideRetry(
        result.outcome_code,
        lead.attempts || 0,
        lead.max_attempts || 3,
        result.follow_up_at
      );
      await svc
        .from("leads")
        .update({
          status: decision.nextStatus,
          next_retry_at: decision.nextRetryAt ? decision.nextRetryAt.toISOString() : null,
          outcome_code: result.outcome_code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      const source = await loadSourceById(lead.lead_source_id);
      if (source) {
        try {
          const { ctx, provider } = await buildProviderCtx(source);
          const leadRow: any = (
            await svc.from("leads").select("external_id").eq("id", lead.id).maybeSingle()
          ).data;
          if (leadRow?.external_id) {
            await provider.markLeadCalled(ctx, leadRow.external_id, {
              outcome: result.outcome_code,
              summary: result.summary,
              sentiment: result.sentiment,
              capturedFields: capturedForWriteback,
              followUpAt: result.follow_up_at,
            });
            await svc
              .from("call_outcomes")
              .update({ writeback_status: "done", updated_at: new Date().toISOString() })
              .eq("call_id", callId);
          }
        } catch (e: any) {
          await svc
            .from("call_outcomes")
            .update({
              writeback_status: "failed",
              writeback_attempts: 1,
              writeback_last_error: (e?.message || String(e)).slice(0, 2000),
              updated_at: new Date().toISOString(),
            })
            .eq("call_id", callId);
        }
      }
    }
  }

  return { ok: true };
}
