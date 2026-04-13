import { getServiceClient } from "@/lib/supabase/service";
import { decryptSecret, encryptSecret, isEncrypted, randomToken } from "@/lib/crypto";

export type CredBundle = Record<string, any>;

const ROOT_KEY = "lead_source_credentials";

export async function writeCredentials(
  userId: string,
  bundle: CredBundle
): Promise<string> {
  const svc = getServiceClient();
  const ref = randomToken(16);
  const encrypted = encryptSecret(JSON.stringify(bundle));

  const { data: existing } = await svc
    .from("user_settings")
    .select("id, settings")
    .eq("user_id", userId)
    .maybeSingle();

  const settings = (existing?.settings as Record<string, any>) ?? {};
  const creds = (settings[ROOT_KEY] as Record<string, string>) ?? {};
  creds[ref] = encrypted;
  settings[ROOT_KEY] = creds;

  if (existing) {
    const { error } = await svc
      .from("user_settings")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await svc
      .from("user_settings")
      .insert({ user_id: userId, settings });
    if (error) throw error;
  }
  return ref;
}

export async function readCredentials(
  userId: string,
  ref: string
): Promise<CredBundle | null> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();
  const blob = data?.settings?.[ROOT_KEY]?.[ref];
  if (!blob) return null;
  if (!isEncrypted(blob)) {
    throw new Error("Credential bundle is not encrypted; aborting read");
  }
  return JSON.parse(decryptSecret(blob));
}

export async function updateCredentials(
  userId: string,
  ref: string,
  bundle: CredBundle
): Promise<void> {
  const svc = getServiceClient();
  const { data: existing } = await svc
    .from("user_settings")
    .select("id, settings")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) throw new Error("user_settings row missing");
  const settings = (existing.settings as Record<string, any>) ?? {};
  const creds = (settings[ROOT_KEY] as Record<string, string>) ?? {};
  creds[ref] = encryptSecret(JSON.stringify(bundle));
  settings[ROOT_KEY] = creds;
  const { error } = await svc
    .from("user_settings")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", existing.id);
  if (error) throw error;
}

export async function deleteCredentials(userId: string, ref: string): Promise<void> {
  const svc = getServiceClient();
  const { data: existing } = await svc
    .from("user_settings")
    .select("id, settings")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) return;
  const settings = (existing.settings as Record<string, any>) ?? {};
  const creds = (settings[ROOT_KEY] as Record<string, string>) ?? {};
  delete creds[ref];
  settings[ROOT_KEY] = creds;
  await svc
    .from("user_settings")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", existing.id);
}
