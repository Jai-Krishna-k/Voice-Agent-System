import type { NextRequest } from "next/server";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/crypto";
import { updateCredentials } from "./credentials";
import type {
  CredBundle,
  LeadSourceProvider,
  PreviewResult,
  ProviderCtx,
  RawLead,
  WritebackInstruction,
} from "./types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
].join(" ");

const OUTCOME_COL_HEADER = "Call Outcome";
const SUMMARY_COL_HEADER = "Call Summary";
const CALLED_AT_COL_HEADER = "Last Called At";
const LEAD_UID_COL_HEADER = "__lead_uid";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function refreshAccessToken(creds: CredBundle): Promise<CredBundle> {
  const clientId = envOrThrow("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = envOrThrow("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!creds.refresh_token) {
    throw new Error("Missing refresh_token; reauth required");
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return {
    ...creds,
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000,
  };
}

async function ensureFreshToken(ctx: ProviderCtx): Promise<string> {
  let creds = ctx.credentials;
  if (!creds.access_token || !creds.expires_at || creds.expires_at < Date.now()) {
    creds = await refreshAccessToken(creds);
    await updateCredentials(ctx.source.user_id, ctx.source.credentials_ref, creds);
    ctx.credentials = creds;
  }
  return creds.access_token;
}

async function sheetsGet(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Sheets get failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function sheetsBatchUpdate(
  token: string,
  spreadsheetId: string,
  body: any
): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Sheets batchUpdate failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function rowsToRawLeads(
  values: any[][],
  sinceRowIndex = 0
): { columns: string[]; leads: RawLead[] } {
  if (!values || values.length === 0) return { columns: [], leads: [] };
  const columns = (values[0] as any[]).map((c) => String(c ?? "").trim());
  const leads: RawLead[] = [];
  const uidCol = columns.indexOf(LEAD_UID_COL_HEADER);
  for (let r = Math.max(1, sinceRowIndex); r < values.length; r++) {
    const row = values[r] || [];
    if (row.every((c) => c === "" || c === null || c === undefined)) continue;
    const fields: Record<string, any> = {};
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      if (!col || col === LEAD_UID_COL_HEADER) continue;
      fields[col] = row[c] ?? "";
    }
    let uid: string | null = uidCol >= 0 ? String(row[uidCol] ?? "").trim() : "";
    if (!uid) uid = `row-${r + 1}`;
    leads.push({ externalId: uid, fields });
  }
  return { columns, leads };
}

function columnIndexToA1(idx: number): string {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function findRowByUid(
  token: string,
  spreadsheetId: string,
  tab: string,
  uid: string
): Promise<{ rowIndex: number; columns: string[] } | null> {
  const data = await sheetsGet(token, spreadsheetId, `${tab}`);
  const values: any[][] = data.values || [];
  if (values.length === 0) return null;
  const columns = (values[0] as any[]).map((c) => String(c ?? "").trim());
  const uidCol = columns.indexOf(LEAD_UID_COL_HEADER);
  if (uidCol < 0) return null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r]?.[uidCol] ?? "").trim() === uid) {
      return { rowIndex: r, columns };
    }
  }
  return null;
}

async function ensureWritebackColumns(
  token: string,
  spreadsheetId: string,
  tab: string,
  columns: string[]
): Promise<string[]> {
  const needed = [OUTCOME_COL_HEADER, SUMMARY_COL_HEADER, CALLED_AT_COL_HEADER];
  const missing = needed.filter((h) => !columns.includes(h));
  if (missing.length === 0) return columns;
  const newHeaderRow = [...columns, ...missing];
  const range = `${tab}!A1:${columnIndexToA1(newHeaderRow.length - 1)}1`;
  await sheetsBatchUpdate(token, spreadsheetId, {
    valueInputOption: "RAW",
    data: [{ range, values: [newHeaderRow] }],
  });
  return newHeaderRow;
}

export const googleSheetsProvider: LeadSourceProvider = {
  id: "google_sheets",

  async listNewLeads(ctx: ProviderCtx): Promise<RawLead[]> {
    const token = await ensureFreshToken(ctx);
    const spreadsheetId = ctx.source.config.spreadsheet_id as string;
    const tab = (ctx.source.config.tab as string) || "Sheet1";
    if (!spreadsheetId) throw new Error("spreadsheet_id not configured");
    const data = await sheetsGet(token, spreadsheetId, tab);
    const { leads } = rowsToRawLeads(data.values || []);
    return leads;
  },

  async preview(ctx: ProviderCtx): Promise<PreviewResult> {
    const token = await ensureFreshToken(ctx);
    const spreadsheetId = ctx.source.config.spreadsheet_id as string;
    const tab = (ctx.source.config.tab as string) || "Sheet1";
    if (!spreadsheetId) throw new Error("spreadsheet_id not configured");
    const data = await sheetsGet(token, spreadsheetId, `${tab}!A1:Z20`);
    const { columns, leads } = rowsToRawLeads(data.values || []);
    return { columns, sample: leads.slice(0, 5) };
  },

  async verifyWebhook(_req: NextRequest, secret: string, rawBody: string): Promise<boolean> {
    // This is invoked by the webhook route with the raw body + X-Signature header.
    // Actual header comparison happens in the route because NextRequest.headers is needed.
    return !!secret && !!rawBody;
  },

  async parseWebhookPayload(rawBody: string): Promise<RawLead[]> {
    const payload = JSON.parse(rawBody);
    // Apps Script POSTs: {lead_uid, values, columns, sheet, timestamp}
    const uid: string = String(payload.lead_uid || "").trim();
    const columns: string[] = payload.columns || [];
    const values: any[] = payload.values || [];
    const fields: Record<string, any> = {};
    for (let i = 0; i < columns.length; i++) {
      const col = String(columns[i] || "").trim();
      if (!col || col === LEAD_UID_COL_HEADER) continue;
      fields[col] = values[i] ?? "";
    }
    if (!uid) return [];
    return [{ externalId: uid, fields }];
  },

  async markLeadCalled(
    ctx: ProviderCtx,
    externalId: string,
    instruction: WritebackInstruction
  ): Promise<void> {
    const token = await ensureFreshToken(ctx);
    const spreadsheetId = ctx.source.config.spreadsheet_id as string;
    const tab = (ctx.source.config.tab as string) || "Sheet1";
    const found = await findRowByUid(token, spreadsheetId, tab, externalId);
    if (!found) return;
    const columns = await ensureWritebackColumns(token, spreadsheetId, tab, found.columns);
    const outcomeIdx = columns.indexOf(OUTCOME_COL_HEADER);
    const summaryIdx = columns.indexOf(SUMMARY_COL_HEADER);
    const calledIdx = columns.indexOf(CALLED_AT_COL_HEADER);
    const rowNumber = found.rowIndex + 1;

    const updates: { range: string; values: any[][] }[] = [];
    if (outcomeIdx >= 0) {
      updates.push({
        range: `${tab}!${columnIndexToA1(outcomeIdx)}${rowNumber}`,
        values: [[instruction.outcome]],
      });
    }
    if (summaryIdx >= 0) {
      updates.push({
        range: `${tab}!${columnIndexToA1(summaryIdx)}${rowNumber}`,
        values: [[instruction.summary || ""]],
      });
    }
    if (calledIdx >= 0) {
      updates.push({
        range: `${tab}!${columnIndexToA1(calledIdx)}${rowNumber}`,
        values: [[new Date().toISOString()]],
      });
    }
    if (updates.length) {
      await sheetsBatchUpdate(token, spreadsheetId, {
        valueInputOption: "RAW",
        data: updates,
      });
    }
  },

  oauthStart(state: string, redirectUri: string): string {
    const clientId = envOrThrow("GOOGLE_OAUTH_CLIENT_ID");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SHEETS_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async oauthCallback(code: string, redirectUri: string): Promise<CredBundle> {
    const clientId = envOrThrow("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = envOrThrow("GOOGLE_OAUTH_CLIENT_SECRET");
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
    }
    const json = await res.json();
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000,
      scope: json.scope,
      token_type: json.token_type,
    };
  },

  async refreshToken(creds: CredBundle): Promise<CredBundle> {
    return refreshAccessToken(creds);
  },
};

export function verifyAppsScriptSignature(
  secret: string,
  rawBody: string,
  headerSig: string | null
): boolean {
  if (!headerSig) return false;
  const expected = hmacSha256Hex(secret, rawBody);
  return timingSafeEqualHex(expected, headerSig.trim().toLowerCase());
}

export const APPS_SCRIPT_TEMPLATE = `// Aryantra Voice Agent — Sheets lead webhook
// 1) Replace WEBHOOK_URL and WEBHOOK_SECRET below.
// 2) Save. Triggers \u2192 Add trigger \u2192 installEdits() \u2192 From spreadsheet \u2192 On edit
// 3) Repeat for On form submit if you use Forms.

const WEBHOOK_URL = "__WEBHOOK_URL__";
const WEBHOOK_SECRET = "__WEBHOOK_SECRET__";
const UID_COLUMN = "__lead_uid";

function _ensureUidColumn_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let idx = headers.indexOf(UID_COLUMN);
  if (idx === -1) {
    sheet.getRange(1, headers.length + 1).setValue(UID_COLUMN);
    idx = headers.length;
  }
  return idx;
}

function _hmac_(body) {
  const bytes = Utilities.computeHmacSha256Signature(body, WEBHOOK_SECRET);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function _postRow_(sheet, row) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  const uidIdx = _ensureUidColumn_(sheet);
  let uid = values[uidIdx];
  if (!uid) {
    uid = Utilities.getUuid();
    sheet.getRange(row, uidIdx + 1).setValue(uid);
    values[uidIdx] = uid;
  }
  const payload = JSON.stringify({
    lead_uid: uid,
    row: row,
    columns: headers,
    values: values,
    sheet: sheet.getName(),
    timestamp: Date.now(),
  });
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Signature": _hmac_(payload) },
    payload: payload,
    muteHttpExceptions: true,
  });
}

function installEdits(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  if (row === 1) return;
  _postRow_(sheet, row);
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  _postRow_(sheet, row);
}
`;
