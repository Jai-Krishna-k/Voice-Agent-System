"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, PhoneOff, Phone } from "lucide-react";

interface Lead {
  id: string;
  lead_source_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  attempts: number;
  outcome_code: string | null;
  next_retry_at: string | null;
  last_called_at: string | null;
  created_at: string;
}

const STATUSES = ["", "new", "queued", "calling", "called", "failed", "do_not_call"];
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  queued: "bg-indigo-500/20 text-indigo-300",
  calling: "bg-amber-500/20 text-amber-300",
  called: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  do_not_call: "bg-zinc-500/20 text-zinc-300",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    const url = filter ? `/api/leads?status=${filter}` : "/api/leads";
    const res = await fetch(url);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function act(id: string, action: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-semibold text-white">Leads</h1>
        </div>
        <button
          onClick={load}
          className="p-2 rounded hover:bg-white/[0.05] text-zinc-400"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              filter === s
                ? "bg-white text-black"
                : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08]"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="text-zinc-500 text-sm">No leads yet. Connect an integration to start.</div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-zinc-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Lead</th>
                <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Outcome</th>
                <th className="text-left px-4 py-2.5 font-medium">Attempts</th>
                <th className="text-left px-4 py-2.5 font-medium">Next retry</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-white">
                    <div>{l.name || "—"}</div>
                    {l.email && <div className="text-xs text-zinc-500">{l.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{l.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[l.status] || "bg-white/[0.05] text-zinc-400"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">
                    {l.outcome_code || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{l.attempts}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {l.next_retry_at ? new Date(l.next_retry_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        disabled={busy === l.id || l.status === "do_not_call" || l.status === "calling" || l.status === "queued"}
                        onClick={() => act(l.id, "dispatch")}
                        className="p-1.5 rounded hover:bg-white/[0.05] text-emerald-400 disabled:opacity-30"
                        title="Call now"
                      >
                        {busy === l.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Phone className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        disabled={busy === l.id}
                        onClick={() => act(l.id, "do_not_call")}
                        className="p-1.5 rounded hover:bg-white/[0.05] text-zinc-400 disabled:opacity-30"
                        title="Mark do-not-call"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
