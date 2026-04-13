import { Phone } from "lucide-react";
import Link from "next/link";
import { getCalls } from "@/lib/supabase/queries";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    completed: "bg-success/10 text-green-400",
    answered: "bg-blue-500/10 text-blue-400",
    initiated: "bg-yellow-500/10 text-yellow-400",
    ringing: "bg-yellow-500/10 text-yellow-400",
    failed: "bg-destructive/10 text-red-400",
    transferred: "bg-purple-500/10 text-purple-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
        colors[status] || "bg-zinc-800 text-zinc-400"
      }`}
    >
      {status}
    </span>
  );
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CallsPage() {
  let calls: any[] = [];
  let fetchError = false;

  try {
    calls = await getCalls();
  } catch {
    fetchError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Call History</h1>
          <p className="text-sm text-muted mt-1">
            View all past calls, transcripts, and recordings
          </p>
        </div>
        <Link
          href="/calls/new"
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          New Call
        </Link>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="border-b border-card-border px-5 py-3">
          <div className="grid grid-cols-5 gap-4 text-xs font-medium text-muted uppercase tracking-wider">
            <span>Phone</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Voice</span>
            <span>Date</span>
          </div>
        </div>

        {fetchError || calls.length === 0 ? (
          <div className="text-center py-16">
            <Phone className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-muted">
              {fetchError
                ? "Connect Supabase to see call history"
                : "No calls yet"}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {fetchError
                ? "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
                : "Make your first call from the New Call page"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {calls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="grid grid-cols-5 gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors items-center"
              >
                <span className="text-sm text-zinc-300 font-mono">
                  {call.phone_number}
                </span>
                <span>{statusBadge(call.status)}</span>
                <span className="text-sm text-muted">
                  {formatDuration(call.duration_secs)}
                </span>
                <span className="text-sm text-muted capitalize">
                  {call.voice_id || "—"}
                </span>
                <span className="text-sm text-muted">
                  {formatDate(call.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
