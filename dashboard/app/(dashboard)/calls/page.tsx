import Link from "next/link";
import { getCalls } from "@/lib/supabase/queries";

function statusColor(status: string) {
  const map: Record<string, string> = {
    completed:   "text-emerald-500",
    answered:    "text-stone-300",
    initiated:   "text-amber-400",
    ringing:     "text-amber-400",
    calling:     "text-amber-500",
    failed:      "text-red-500",
    transferred: "text-stone-400",
  };
  return map[status] ?? "text-stone-500";
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
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1">Activity</p>
          <h1 className="text-[22px] font-semibold text-stone-100 tracking-tight">Calls</h1>
        </div>
        <Link
          href="/calls/new"
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-4 py-2 tracking-wide transition-colors"
        >
          + New Call
        </Link>
      </div>

      {/* Table */}
      <div>
        {/* Column headers */}
        <div className="flex items-center py-2 border-b border-[#181818]">
          <span className="text-[10px] uppercase tracking-widest text-stone-600 w-44">Phone</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-600 w-28">Status</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-600 w-24">Duration</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-600 w-36">Voice</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-600 ml-auto">Date</span>
        </div>

        {fetchError || calls.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-700">
            {fetchError ? "Connect Supabase to see call history" : "No calls yet — make your first call"}
          </div>
        ) : (
          calls.map((call) => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              className="flex items-center py-3.5 border-b border-[#0F0F0F] hover:bg-[#0C0C0C] transition-colors group"
            >
              <span className="font-mono text-sm text-stone-300 w-44 shrink-0">
                {call.phone_number}
              </span>
              <span className={`text-xs w-28 shrink-0 ${statusColor(call.status)}`}>
                {call.status}
              </span>
              <span className="font-mono text-xs text-stone-500 w-24 shrink-0">
                {formatDuration(call.duration_secs)}
              </span>
              <span className="text-xs text-stone-600 w-36 shrink-0 truncate">
                {call.voice_id || "—"}
              </span>
              <span className="text-xs text-stone-700 ml-auto">
                {formatDate(call.created_at)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
