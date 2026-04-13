import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createSupabaseClient(serviceUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userId = user.id;
    const bucket =
      process.env.SUPABASE_STORAGE_BUCKET || "call-recordings";

    // 1. List all objects in the user's recording folder and delete them.
    // Recordings are keyed by room name, not user id — we can't safely
    // scope storage by prefix, so instead we look up this user's call
    // rooms and delete those specific objects.
    const { data: userCalls } = await admin
      .from("calls")
      .select("room_name")
      .eq("user_id", userId);

    if (userCalls && userCalls.length > 0) {
      const objectPaths = userCalls
        .map((c: { room_name: string | null }) => c.room_name)
        .filter((n): n is string => !!n)
        .map((n) => `${n}.ogg`);

      if (objectPaths.length > 0) {
        await admin.storage.from(bucket).remove(objectPaths);
      }
    }

    // 2. Delete DB rows. With ON DELETE CASCADE on user_id FKs these
    // would clean up automatically when we delete the auth user, but
    // the schema doesn't guarantee that, so we do it explicitly.
    const tables = [
      "transcripts",
      "calls",
      "agent_configs",
      "phone_numbers",
      "knowledge_chunks",
      "knowledge_files",
      "user_settings",
    ];

    for (const table of tables) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) {
        console.warn(`Failed to delete from ${table}:`, error.message);
      }
    }

    // 3. Delete the auth user itself.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    // 4. Sign out the current session cookie.
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
