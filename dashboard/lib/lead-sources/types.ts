import type { NextRequest } from "next/server";
import type { OutcomeCode } from "./outcomes";

export type ProviderId = "google_sheets" | "hubspot" | "pipedrive";

export interface RawLead {
  externalId: string;
  fields: Record<string, any>;
  initialStatus?: "new" | "do_not_call";
}

export interface NormalizedLead {
  externalId: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  custom: Record<string, any>;
  raw: Record<string, any>;
}

export interface FieldMapping {
  phone?: string;
  name?: string;
  email?: string;
  custom?: Record<string, string>;
}

export interface CredBundle {
  [k: string]: any;
}

export interface LeadSourceRow {
  id: string;
  user_id: string;
  provider: ProviderId;
  display_name: string;
  credentials_ref: string;
  config: Record<string, any>;
  field_mapping: FieldMapping;
  webhook_token: string;
  webhook_secret: string;
  is_active: boolean;
  polling_enabled: boolean;
  poll_interval_secs: number;
  call_window: CallWindow;
  concurrency_cap: number;
  last_synced_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
  status: "ok" | "needs_reauth" | "error" | "paused";
}

export interface CallWindow {
  tz: string;
  days: number[];
  start: string;
  end: string;
}

export interface ProviderCtx {
  source: LeadSourceRow;
  credentials: CredBundle;
}

export interface PreviewResult {
  columns: string[];
  sample: RawLead[];
}

export interface WritebackInstruction {
  outcome: OutcomeCode;
  summary: string;
  sentiment?: "positive" | "neutral" | "negative";
  capturedFields?: Record<string, any>;
  followUpAt?: string | null;
}

export interface LeadSourceProvider {
  id: ProviderId;
  listNewLeads(ctx: ProviderCtx, since: Date | null): Promise<RawLead[]>;
  preview(ctx: ProviderCtx): Promise<PreviewResult>;
  verifyWebhook(req: NextRequest, secret: string, rawBody: string): Promise<boolean>;
  parseWebhookPayload(rawBody: string, ctx: ProviderCtx): Promise<RawLead[]>;
  markLeadCalled(
    ctx: ProviderCtx,
    externalId: string,
    instruction: WritebackInstruction
  ): Promise<void>;
  oauthStart?(state: string, redirectUri: string): string;
  oauthCallback?(code: string, redirectUri: string): Promise<CredBundle>;
  refreshToken?(creds: CredBundle): Promise<CredBundle>;
}
