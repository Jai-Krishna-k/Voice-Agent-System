import type { FieldMapping, NormalizedLead, RawLead } from "./types";
import { normalizePhone } from "./phone-normalize";

const PHONE_HINTS = ["phone", "mobile", "cell", "tel", "contact", "number"];
const NAME_HINTS = ["name", "full name", "customer", "contact"];
const EMAIL_HINTS = ["email", "e-mail", "mail"];

function pickByHint(columns: string[], hints: string[]): string | undefined {
  const lower = columns.map((c) => ({ raw: c, low: c.toLowerCase().trim() }));
  for (const h of hints) {
    const hit = lower.find((c) => c.low === h);
    if (hit) return hit.raw;
  }
  for (const h of hints) {
    const hit = lower.find((c) => c.low.includes(h));
    if (hit) return hit.raw;
  }
  return undefined;
}

export function autoDetectMapping(columns: string[]): FieldMapping {
  return {
    phone: pickByHint(columns, PHONE_HINTS),
    name: pickByHint(columns, NAME_HINTS),
    email: pickByHint(columns, EMAIL_HINTS),
    custom: {},
  };
}

export function mapRawLead(raw: RawLead, mapping: FieldMapping): NormalizedLead {
  const fields = raw.fields || {};
  const phoneRaw = mapping.phone ? fields[mapping.phone] : undefined;
  const nameRaw = mapping.name ? fields[mapping.name] : undefined;
  const emailRaw = mapping.email ? fields[mapping.email] : undefined;

  const custom: Record<string, any> = {};
  if (mapping.custom) {
    for (const [label, col] of Object.entries(mapping.custom)) {
      if (col && fields[col] !== undefined) custom[label] = fields[col];
    }
  }

  return {
    externalId: raw.externalId,
    phone: normalizePhone(phoneRaw ?? null),
    name: nameRaw ? String(nameRaw).trim() : null,
    email: emailRaw ? String(emailRaw).trim().toLowerCase() : null,
    custom,
    raw: fields,
  };
}
