import type { NextRequest } from "next/server";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/crypto";
import type {
  CredBundle,
  LeadSourceProvider,
  PreviewResult,
  ProviderCtx,
  RawLead,
  WritebackInstruction,
} from "./types";
import { OUTCOME_LABELS } from "./outcomes";

// Pipedrive API v1 base
const PD_BASE = "https://api.pipedrive.com/v1";

// Pipedrive webhook signature header
const PD_SIG_HEADER = "x-pipedrive-signature";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function pdGet(token: string, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${PD_BASE}${path}`);
  url.searchParams.set("api_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pipedrive GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pdPost(token: string, path: string, body: any): Promise<any> {
  const url = new URL(`${PD_BASE}${path}`);
  url.searchParams.set("api_token", token);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pipedrive POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pdPut(token: string, path: string, body: any): Promise<any> {
  const url = new URL(`${PD_BASE}${path}`);
  url.searchParams.set("api_token", token);
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pipedrive PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Lead mapping ─────────────────────────────────────────────────────────────

function personToRawLead(person: any): RawLead {
  const phone = (person.phone ?? []).find((p: any) => p.primary)?.value
    ?? person.phone?.[0]?.value
    ?? null;
  const email = (person.email ?? []).find((e: any) => e.primary)?.value
    ?? person.email?.[0]?.value
    ?? null;

  return {
    externalId: String(person.id),
    fields: {
      id: person.id,
      name: person.name ?? null,
      phone,
      email,
      org_name: person.org_name ?? null,
      owner_name: person.owner_name ?? null,
      add_time: person.add_time ?? null,
      update_time: person.update_time ?? null,
    },
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const pipedriveProvider: LeadSourceProvider = {
  id: "pipedrive",

  // ── Lead listing ───────────────────────────────────────────────────────────

  async listNewLeads(ctx: ProviderCtx, since: Date | null): Promise<RawLead[]> {
    const token = ctx.credentials.api_token;
    if (!token) throw new Error("No Pipedrive API token");

    const leads: RawLead[] = [];
    let start = 0;
    const limit = 100;

    // Filter by add_time if we have a since date
    const sinceStr = since
      ? since.toISOString().replace("T", " ").substring(0, 19)
      : new Date(Date.now() - 86_400_000).toISOString().replace("T", " ").substring(0, 19);

    do {
      const data = await pdGet(token, "/persons", {
        filter_id: ctx.source.config?.filter_id ?? "",
        start: String(start),
        limit: String(limit),
        sort: "add_time ASC",
      });

      const items: any[] = data.data ?? [];
      for (const person of items) {
        // Only include persons added after since
        if (since && person.add_time && new Date(person.add_time) <= since) continue;
        leads.push(personToRawLead(person));
      }

      if (!data.additional_data?.pagination?.more_items_in_collection) break;
      start += limit;
    } while (true);

    return leads;
  },

  // ── Preview ────────────────────────────────────────────────────────────────

  async preview(ctx: ProviderCtx): Promise<PreviewResult> {
    const token = ctx.credentials.api_token;
    if (!token) throw new Error("No Pipedrive API token");

    const data = await pdGet(token, "/persons", { limit: "5", sort: "add_time DESC" });
    const sample = (data.data ?? []).map(personToRawLead);
    const columns = Object.keys(sample[0]?.fields ?? {});
    return { columns, sample };
  },

  // ── Webhook ────────────────────────────────────────────────────────────────

  /**
   * Pipedrive signs webhooks with HMAC-SHA256.
   * Signature is in x-pipedrive-signature header, computed over the raw body.
   */
  async verifyWebhook(req: NextRequest, secret: string, rawBody: string): Promise<boolean> {
    try {
      const sig = req.headers.get(PD_SIG_HEADER);
      if (!sig) return false;
      const expected = hmacSha256Hex(secret, rawBody);
      return timingSafeEqualHex(sig, expected);
    } catch {
      return false;
    }
  },

  /**
   * Pipedrive sends one event per webhook call.
   * We care about person.added events.
   */
  async parseWebhookPayload(rawBody: string, _ctx: ProviderCtx): Promise<RawLead[]> {
    try {
      const event = JSON.parse(rawBody);
      // Only process new person creation
      if (event.event !== "added.person" && event.meta?.action !== "added") return [];
      const person = event.current ?? event.data;
      if (!person) return [];
      return [personToRawLead(person)];
    } catch {
      return [];
    }
  },

  // ── Writeback ──────────────────────────────────────────────────────────────

  async markLeadCalled(
    ctx: ProviderCtx,
    externalId: string,
    instruction: WritebackInstruction
  ): Promise<void> {
    const token = ctx.credentials.api_token;
    if (!token) throw new Error("No Pipedrive API token");

    const label = OUTCOME_LABELS[instruction.outcome] ?? instruction.outcome;
    const noteLines = [
      `📞 AI Voice Agent Call`,
      `Outcome: ${label}`,
    ];
    if (instruction.sentiment) noteLines.push(`Sentiment: ${instruction.sentiment}`);
    if (instruction.summary) noteLines.push(`\nSummary: ${instruction.summary}`);
    if (instruction.followUpAt) {
      noteLines.push(`Follow-up: ${new Date(instruction.followUpAt).toLocaleString()}`);
    }
    if (instruction.capturedFields && Object.keys(instruction.capturedFields).length > 0) {
      noteLines.push(`\nCaptured:`);
      for (const [k, v] of Object.entries(instruction.capturedFields)) {
        noteLines.push(`  • ${k}: ${v}`);
      }
    }

    // Add a note to the person
    await pdPost(token, "/notes", {
      content: noteLines.join("\n"),
      person_id: parseInt(externalId, 10),
      pinned_to_person_flag: 0,
    });

    // Update person's label/tag to reflect outcome
    const pdLabel = pipedriveLabel(instruction.outcome);
    if (pdLabel) {
      await pdPut(token, `/persons/${externalId}`, { label: pdLabel });
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipedriveLabel(outcome: string): string | null {
  switch (outcome) {
    case "answered_interested":   return "hot_lead";
    case "answered_callback":     return "warm_lead";
    case "answered_not_interested": return "cold_lead";
    case "do_not_call":           return "lost";
    default:                      return null;
  }
}
