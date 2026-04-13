import { createHmac, randomBytes } from "crypto";

function stateKey(): string {
  const k = process.env.OAUTH_STATE_SECRET || process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!k) throw new Error("OAUTH_STATE_SECRET or CREDENTIALS_ENCRYPTION_KEY must be set");
  return k;
}

export function signState(payload: Record<string, any>, ttlMs = 10 * 60 * 1000): string {
  const body = {
    ...payload,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + ttlMs,
  };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", stateKey()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyState(token: string): Record<string, any> | null {
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", stateKey()).update(json).digest("base64url");
  if (expected !== sig) return null;
  try {
    const body = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (!body.exp || body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}
