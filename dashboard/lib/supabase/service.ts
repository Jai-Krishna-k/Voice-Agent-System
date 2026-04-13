import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL");
  }
  cached = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
