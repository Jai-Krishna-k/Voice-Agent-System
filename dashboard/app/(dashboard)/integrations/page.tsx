"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plug, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

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
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
};

export default function IntegrationsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

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
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Plug className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
          Available providers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {available.map((provider) => (
            <Link
              key={provider}
              href={`/integrations/${provider}/setup`}
              className="p-4 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <div className="text-white font-medium">
                {PROVIDER_LABELS[provider] || provider}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {provider === "google_sheets"
                  ? "OAuth + Apps Script real-time sync"
                  : provider === "hubspot"
                  ? "API token — contacts synced every 5 min"
                  : provider === "pipedrive"
                  ? "API token — persons synced every 5 min"
                  : "Coming soon"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
          Connected sources
        </h2>
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : sources.length === 0 ? (
          <div className="text-zinc-500 text-sm">No sources connected yet.</div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {s.status === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <div>
                    <div className="text-white font-medium">{s.display_name}</div>
                    <div className="text-xs text-zinc-500">
                      {PROVIDER_LABELS[s.provider] || s.provider} ·{" "}
                      {s.last_synced_at
                        ? `last synced ${new Date(s.last_synced_at).toLocaleString()}`
                        : "never synced"}
                      {s.status !== "ok" && ` · ${s.status}`}
                    </div>
                    {s.last_error && (
                      <div className="text-xs text-red-400 mt-1">{s.last_error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sync(s.id)}
                    disabled={busy === s.id}
                    className="p-2 rounded hover:bg-white/[0.05] text-zinc-400 disabled:opacity-40"
                    title="Sync now"
                  >
                    <RefreshCw className={`w-4 h-4 ${busy === s.id ? "animate-spin" : ""}`} />
                  </button>
                  <Link
                    href={`/integrations/${s.provider}/setup?id=${s.id}`}
                    className="text-xs px-3 py-1.5 rounded border border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                  >
                    Configure
                  </Link>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={busy === s.id}
                    className="p-2 rounded hover:bg-white/[0.05] text-zinc-400 disabled:opacity-40"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
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
