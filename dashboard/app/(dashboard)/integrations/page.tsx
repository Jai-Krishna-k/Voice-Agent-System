"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface Source {
  id: string;
  provider: string;
  display_name: string;
  status: string;
  is_active: boolean;
  polling_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  google_sheets: "Google Sheets",
  hubspot:       "HubSpot",
  pipedrive:     "Pipedrive",
};

const PROVIDER_DESC: Record<string, string> = {
  google_sheets: "OAuth · Real-time webhook",
  hubspot:       "API token · Polling every 5 min",
  pipedrive:     "API token · Polling every 5 min",
};

export default function IntegrationsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/lead-sources");
      const data = await res.json();
      setSources(data.sources || []);
      setAvailable(data.available || []);
    } finally {
      setLoading(false);
    }
  }

  async function sync(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/lead-sources/${id}/sync`, { method: "POST" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Disconnect this source? Lead data will remain.")) return;
    setBusy(id);
    try {
      await fetch(`/api/lead-sources/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1">Data Sources</p>
        <h1 className="text-[22px] font-semibold text-stone-100 tracking-tight">Integrations</h1>
      </div>

      {/* Available providers */}
      <section className="mb-10">
        <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3">Available providers</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {available.map((provider) => (
            <Link
              key={provider}
              href={`/integrations/${provider}/setup`}
              className="block border border-[#181818] hover:border-amber-500/30 p-5 transition-colors"
            >
              <div className="text-sm font-medium text-stone-200 mb-1">
                {PROVIDER_LABELS[provider] || provider}
              </div>
              <div className="text-[11px] text-stone-600">
                {PROVIDER_DESC[provider] || "Coming soon"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Connected sources */}
      <section>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3">Connected sources</p>

        {loading ? (
          <div className="text-stone-600 text-sm">Loading…</div>
        ) : sources.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-700 border border-[#181818]">
            No sources connected yet.
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center py-2 border-b border-[#181818]">
              <span className="text-[10px] uppercase tracking-widest text-stone-600 w-6" />
              <span className="text-[10px] uppercase tracking-widest text-stone-600 flex-1">Source</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-600 w-36">Last synced</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-600 w-24 text-right">Actions</span>
            </div>

            {sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center py-3.5 border-b border-[#0F0F0F] hover:bg-[#0C0C0C] transition-colors"
              >
                <div className="w-6 shrink-0">
                  {s.status === "ok"
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-200">{s.display_name}</div>
                  <div className="text-[11px] text-stone-600">
                    {PROVIDER_LABELS[s.provider] || s.provider}
                    {s.status !== "ok" && <span className="text-amber-600 ml-2">· {s.status}</span>}
                  </div>
                  {s.last_error && (
                    <div className="text-[11px] text-red-500 mt-0.5 truncate">{s.last_error}</div>
                  )}
                </div>
                <div className="w-36 shrink-0 text-xs text-stone-700">
                  {s.last_synced_at
                    ? new Date(s.last_synced_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "never"}
                </div>
                <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                  <button
                    onClick={() => sync(s.id)}
                    disabled={busy === s.id}
                    className="p-1.5 text-stone-600 hover:text-stone-300 disabled:opacity-30 transition-colors"
                    title="Sync now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busy === s.id ? "animate-spin" : ""}`} />
                  </button>
                  <Link
                    href={`/integrations/${s.provider}/setup?id=${s.id}`}
                    className="text-[11px] px-2.5 py-1 border border-[#282828] text-stone-500 hover:text-stone-200 hover:border-[#383838] transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={busy === s.id}
                    className="p-1.5 text-stone-700 hover:text-red-500 disabled:opacity-30 transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
