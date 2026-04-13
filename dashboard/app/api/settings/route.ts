import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fields that contain sensitive API keys — mask on read
const SENSITIVE_FIELDS = [
  "livekit_api_key",
  "livekit_api_secret",
  "openai_api_key",
  "groq_api_key",
  "deepgram_api_key",
  "sarvam_api_key",
  "anthropic_api_key",
  "google_api_key",
  "azure_openai_api_key",
  "azure_openai_endpoint",
  "azure_openai_deployment",
  "xai_api_key",
  "openrouter_api_key",
  "mistral_api_key",
];

function maskValue(value: string): string {
  if (!value || value.length < 4) return "••••";
  return "••••" + value.slice(-4);
}

function maskSettings(settings: Record<string, string>): {
  masked: Record<string, string>;
  hasKeys: Record<string, boolean>;
} {
  const masked: Record<string, string> = {};
  const hasKeys: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (SENSITIVE_FIELDS.includes(key) && value) {
      masked[key] = maskValue(value);
      hasKeys[key] = true;
    } else {
      masked[key] = value ?? "";
      if (SENSITIVE_FIELDS.includes(key)) {
        hasKeys[key] = false;
      }
    }
  }

  return { masked, hasKeys };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ settings: null, hasKeys: {} });
    }

    const { masked, hasKeys } = maskSettings(data.settings || {});
    return NextResponse.json({ settings: masked, hasKeys });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const incoming = body.settings as Record<string, string>;

    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json(
        { error: "Invalid settings payload" },
        { status: 400 }
      );
    }

    // Fetch existing settings to preserve keys that weren't changed
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id, settings")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const existingSettings: Record<string, string> =
      existing?.settings || {};

    // Merge: for sensitive fields, keep existing value if incoming is empty or masked
    const merged: Record<string, string> = { ...existingSettings };
    for (const [key, value] of Object.entries(incoming)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        // Skip if empty or looks like a masked value
        if (!value || value.startsWith("••••")) {
          continue;
        }
      }
      merged[key] = value;
    }

    let result;
    if (existing) {
      result = await supabase
        .from("user_settings")
        .update({
          settings: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          settings: merged,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    const { masked, hasKeys } = maskSettings(result.data.settings || {});
    return NextResponse.json({ settings: masked, hasKeys });
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !SENSITIVE_FIELDS.includes(key)) {
      return NextResponse.json(
        { error: "Invalid or missing key parameter" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id, settings")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ settings: {}, hasKeys: {} });
    }

    const updated: Record<string, string> = { ...(existing.settings || {}) };
    delete updated[key];

    const { data, error } = await supabase
      .from("user_settings")
      .update({
        settings: updated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    const { masked, hasKeys } = maskSettings(data.settings || {});
    return NextResponse.json({ settings: masked, hasKeys });
  } catch (error: any) {
    console.error("Error deleting settings key:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
