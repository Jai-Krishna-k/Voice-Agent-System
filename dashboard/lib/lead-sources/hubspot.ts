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

// HubSpot HMAC v3 header
const HS_SIGNATURE_HEADER = "x-hubspot-signature-v3";
const HS_TIMESTAMP_HEADER = "x-hubspot-request-timestamp";

// ─── Token management ───────────────────────────────────────────────────────

async function ensureFreshToken(ctx: ProviderCtx): Promise<string> {
  const token = ctx.credentials.access_token;
  if (!token) throw new Error("No HubSpot access token — reconnect the integration");
  return token;
}

// ─── HubSpot API helpers ─────────────────────────────────────────────────────

async function hsGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HubSpot GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function hsPost(token: string, path: string, body: any): Promise<any> {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function hsPatch(token: string, path: string, body: any): Promise<any> {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot PATCH ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Lead fetching ────────────────────────────────────────────────────────────

/**
 * HubSpot contact properties we always fetch.
 */
const CONTACT_PROPS = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "mobilephone",
  "hs_lead_status",
  "lifecyclestage",
  "createdate",
  "lastmodifieddate",
  "hs_object_id",
];

function contactToRawLead(contact: any): RawLead {
  const p = contact.properties ?? {};
  return {
    externalId: String(contact.id),
    fields: {
      id: contact.id,
      firstname: p.firstname ?? "",
      lastname: p.lastname ?? "",
      name: [p.firstname, p.lastname].filter(Boolean).join(" ") || null,
      email: p.email ?? null,
      phone: p.phone ?? p.mobilephone ?? null,
      hs_lead_status: p.hs_lead_status ?? null,
      lifecyclestage: p.lifecyclestage ?? null,
      createdate: p.createdate ?? null,
      lastmodifieddate: p.lastmodifieddate ?? null,
    },
  };
}

// ─── Provider implementation ──────────────────────────────────────────────────

export const hubspotProvider: LeadSourceProvider = {
  id: "hubspot",

  // ── Lead listing ───────────────────────────────────────────────────────────

  async listNewLeads(ctx: ProviderCtx, since: Date | null): Promise<RawLead[]> {
    const token = await ensureFreshToken(ctx);
    const leads: RawLead[] = [];

    // Use the contacts search API v3 to find new contacts since last sync
    // Filter by createdate if we have a since date; otherwise last 24h
    const afterMs = since ? since.getTime() : Date.now() - 86_400_000;

    // HubSpot search API returns up to 100 per page; paginate with after cursor
    let after: string | undefined;
    do {
      const body: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "createdate",
                operator: "GTE",
                value: String(afterMs),
              },
            ],
          },
        ],
        properties: CONTACT_PROPS,
        limit: 100,
        sorts: [{ propertyName: "createdate", direction: "ASCENDING" }],
      };
      if (after) body.after = after;

      const data = await hsPost(token, "/crm/v3/objects/contacts/search", body);
      for (const contact of data.results ?? []) {
        leads.push(contactToRawLead(contact));
      }
      after = data.paging?.next?.after;
    } while (after);

    return leads;
  },

  // ── Preview ────────────────────────────────────────────────────────────────

  async preview(ctx: ProviderCtx): Promise<PreviewResult> {
    const token = await ensureFreshToken(ctx);

    // Fetch the most recent 5 contacts
    const data = await hsPost(token, "/crm/v3/objects/contacts/search", {
      filterGroups: [],
      properties: CONTACT_PROPS,
      limit: 5,
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    });

    const sample = (data.results ?? []).map(contactToRawLead);
    const columns = Object.keys(sample[0]?.fields ?? {});

    return { columns, sample };
  },

  // ── Webhook ────────────────────────────────────────────────────────────────

  /**
   * HubSpot webhook v3 HMAC verification.
   * Signature = HMAC-SHA256(client_secret, method+uri+body+timestamp)
   * Reject if timestamp is >5 min old.
   */
  async verifyWebhook(req: NextRequest, secret: string, rawBody: string): Promise<boolean> {
    try {
      const sig = req.headers.get(HS_SIGNATURE_HEADER);
      const ts = req.headers.get(HS_TIMESTAMP_HEADER);
      if (!sig || !ts) return false;

      // Reject stale requests (>5 minutes)
      const tsMs = parseInt(ts, 10);
      if (isNaN(tsMs) || Date.now() - tsMs > 5 * 60 * 1000) return false;

      const method = req.method.toUpperCase();
      const uri = req.url;
      const payload = `${method}${uri}${rawBody}${ts}`;
      const expected = hmacSha256Hex(secret, payload);
      return timingSafeEqualHex(sig, expected);
    } catch {
      return false;
    }
  },

  /**
   * HubSpot sends an array of subscription events.
   * Each event contains objectId = contact ID + propertyName changes.
   * We only care about new contact creation events.
   */
  async parseWebhookPayload(rawBody: string, ctx: ProviderCtx): Promise<RawLead[]> {
    const token = await ensureFreshToken(ctx);
    let events: any[];
    try {
      events = JSON.parse(rawBody);
      if (!Array.isArray(events)) events = [events];
    } catch {
      return [];
    }

    // Dedupe contactIds from this webhook batch
    const contactIds = [
      ...new Set(
        events
          .filter((e) => e.subscriptionType === "contact.creation" && e.objectId)
          .map((e) => String(e.objectId))
      ),
    ];

    if (contactIds.length === 0) return [];

    // Batch read contacts
    const data = await hsPost(token, "/crm/v3/objects/contacts/batch/read", {
      properties: CONTACT_PROPS,
      inputs: contactIds.map((id) => ({ id })),
    });

    return (data.results ?? []).map(contactToRawLead);
  },

  // ── Writeback ──────────────────────────────────────────────────────────────

  async markLeadCalled(
    ctx: ProviderCtx,
    externalId: string,
    instruction: WritebackInstruction
  ): Promise<void> {
    const token = await ensureFreshToken(ctx);
    const now = new Date().toISOString();

    // 1. Update contact properties with outcome
    await hsPatch(token, `/crm/v3/objects/contacts/${externalId}`, {
      properties: {
        hs_lead_status: hubspotLeadStatus(instruction.outcome),
        notes_last_contacted: now,
        num_contacted_notes: "1", // HubSpot increments this automatically
      },
    });

    // 2. Create a timeline event / note on the contact
    const noteBody = buildNoteBody(instruction);
    await hsPost(token, "/crm/v3/objects/notes", {
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().getTime().toString(),
      },
      associations: [
        {
          to: { id: externalId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
        },
      ],
    });
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map our outcome codes to HubSpot hs_lead_status values.
 */
function hubspotLeadStatus(outcome: string): string {
  switch (outcome) {
    case "answered_interested":
      return "IN_PROGRESS";
    case "answered_callback":
      return "OPEN";
    case "answered_not_interested":
      return "UNQUALIFIED";
    case "do_not_call":
      return "UNQUALIFIED";
    case "unanswered_voicemail":
    case "unanswered_no_pickup":
      return "ATTEMPTED_TO_CONTACT";
    case "wrong_number":
      return "BAD_TIMING";
    case "transferred_to_human":
      return "CONNECTED";
    default:
      return "ATTEMPTED_TO_CONTACT";
  }
}

function buildNoteBody(instruction: WritebackInstruction): string {
  const label = OUTCOME_LABELS[instruction.outcome] ?? instruction.outcome;
  const lines = [`📞 AI Voice Agent Call`, `Outcome: ${label}`];
  if (instruction.sentiment) lines.push(`Sentiment: ${instruction.sentiment}`);
  if (instruction.summary) lines.push(`\nSummary: ${instruction.summary}`);
  if (instruction.followUpAt) {
    lines.push(`Follow-up scheduled: ${new Date(instruction.followUpAt).toLocaleString()}`);
  }
  if (instruction.capturedFields && Object.keys(instruction.capturedFields).length > 0) {
    lines.push(`\nCaptured info:`);
    for (const [k, v] of Object.entries(instruction.capturedFields)) {
      lines.push(`  • ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}
