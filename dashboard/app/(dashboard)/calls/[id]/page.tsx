import { ArrowLeft, Phone, Bot, User } from "lucide-react";
import Link from "next/link";
import { getCallById, getTranscriptsByCallId } from "@/lib/supabase/queries";
import { notFound } from "next/navigation";

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(ms: number | null) {
  if (ms == null) return "";
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let call: any = null;
  let transcripts: any[] = [];
  let fetchError = false;

  try {
    call = await getCallById(id);
    if (call) {
      transcripts = await getTranscriptsByCallId(id);
    }
  } catch {
    fetchError = true;
  }

  if (!call && !fetchError) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/calls"
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Call Detail</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">Call Info</h2>
            {fetchError || !call ? (
              <p className="text-xs text-muted">
                Connect Supabase to see call details
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Phone</span>
                  <span className="text-zinc-300 font-mono">
                    {call.phone_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <span className="text-zinc-300 capitalize">{call.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Duration</span>
                  <span className="text-zinc-300">
                    {formatDuration(call.duration_secs)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Voice</span>
                  <span className="text-zinc-300 capitalize">
                    {call.voice_id || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Model</span>
                  <span className="text-zinc-300 capitalize">
                    {call.model_provider || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date</span>
                  <span className="text-zinc-300">
                    {new Date(call.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-medium text-zinc-300">Recording</h2>
            {call?.recording_url ? (
              <audio controls className="w-full" src={call.recording_url} />
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted">No recording available</p>
              </div>
            )}
            <p className="text-[10px] text-zinc-600">
              Recordings are automatically deleted after 7 days.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              Transcript
            </h2>

            {transcripts.length === 0 ? (
              <div className="text-center py-16">
                <Phone className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-muted">No transcript available</p>
                <p className="text-xs text-zinc-600 mt-1">
                  {fetchError
                    ? "Connect Supabase to view transcripts"
                    : "Transcript will populate during the call"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`flex gap-3 ${
                      t.speaker === "agent" ? "" : "flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        t.speaker === "agent"
                          ? "bg-accent/20"
                          : "bg-zinc-800"
                      }`}
                    >
                      {t.speaker === "agent" ? (
                        <Bot className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm ${
                        t.speaker === "agent"
                          ? "bg-accent/10 text-zinc-200"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      <p>{t.text}</p>
                      {t.timestamp_ms != null && (
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {formatTimestamp(t.timestamp_ms)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
