import { agentDispatchClient } from "@/lib/server-utils";
import { getServiceClient } from "@/lib/supabase/service";

const SARVAM_VOICES = new Set(["anushka", "aravind", "amartya", "dhruv"]);

const PROVIDER_KEY_MAP: Record<string, string[]> = {
  openai: ["openai_api_key"],
  groq: ["groq_api_key"],
  anthropic: ["anthropic_api_key"],
  google: ["google_api_key"],
  azure: ["azure_openai_api_key", "azure_openai_endpoint", "azure_openai_deployment"],
  xai: ["xai_api_key"],
  openrouter: ["openrouter_api_key"],
  mistral: ["mistral_api_key"],
};

export function requiredKeysFor(modelProvider: string, voice: string): string[] {
  const required = new Set<string>();
  required.add("deepgram_api_key");
  const providerKeys = PROVIDER_KEY_MAP[modelProvider] ?? PROVIDER_KEY_MAP.openai;
  for (const k of providerKeys) required.add(k);
  if (SARVAM_VOICES.has(voice)) required.add("sarvam_api_key");
  else required.add("openai_api_key");
  return Array.from(required);
}

export interface DispatchInput {
  userId: string;
  phoneNumber: string;
  prompt?: string;
  modelProvider?: string;
  voice?: string;
  agentConfigId?: string | null;
  lead?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    custom?: Record<string, any>;
    raw?: Record<string, any>;
  } | null;
}

export interface DispatchResult {
  ok: boolean;
  roomName?: string;
  dispatchId?: string;
  error?: string;
  missing?: string[];
  status?: number;
}

export async function dispatchCall(input: DispatchInput): Promise<DispatchResult> {
  const trunkId = process.env.VOBIZ_SIP_TRUNK_ID;
  if (!trunkId) {
    return { ok: false, error: "SIP Trunk not configured", status: 500 };
  }
  if (!input.phoneNumber) {
    return { ok: false, error: "Phone number is required", status: 400 };
  }

  const svc = getServiceClient();
  let provider = (input.modelProvider || "openai").toLowerCase();
  let voiceId = (input.voice || "anushka").toLowerCase();

  if (input.agentConfigId) {
    const { data: cfg } = await svc
      .from("agent_configs")
      .select("voice_id, model_provider")
      .eq("id", input.agentConfigId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (!cfg) return { ok: false, error: "Agent config not found", status: 404 };
    if (cfg.voice_id) voiceId = cfg.voice_id.toLowerCase();
    if (cfg.model_provider) provider = cfg.model_provider.toLowerCase();
  }

  const required = requiredKeysFor(provider, voiceId);
  const { data: settingsRow } = await svc
    .from("user_settings")
    .select("settings")
    .eq("user_id", input.userId)
    .maybeSingle();
  const userSettings: Record<string, string> = settingsRow?.settings ?? {};
  const missing = required.filter((k) => !userSettings[k]);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing API keys: ${missing.join(", ")}`,
      missing,
      status: 400,
    };
  }

  const { count: activeCount } = await svc
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .in("status", ["initiated", "ringing", "answered"])
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  const cap = parseInt(process.env.GLOBAL_CONCURRENCY_CAP || "20", 10);
  if ((activeCount ?? 0) >= cap) {
    return { ok: false, error: "Global concurrency cap reached", status: 429 };
  }

  const roomName = `call-${input.phoneNumber.replace(/\+/g, "")}-${Math.floor(Math.random() * 10000)}`;

  const metadata = JSON.stringify({
    phone_number: input.phoneNumber,
    user_prompt: input.prompt || "",
    model_provider: provider,
    voice_id: voiceId,
    user_id: input.userId,
    agent_config_id: input.agentConfigId || null,
    lead: input.lead ?? null,
    lead_id: input.lead?.id ?? null,
  });

  const dispatch = await agentDispatchClient.createDispatch(
    roomName,
    "outbound-caller",
    { metadata }
  );

  return { ok: true, roomName, dispatchId: dispatch.id };
}
