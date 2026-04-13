import { randomBytes, createCipheriv, createDecipheriv, createHmac } from "crypto";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32"
    );
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`
    );
  }
  cachedKey = key;
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  const key = loadKey();
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed encrypted blob");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}:`);
}

export function hmacSha256Hex(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
