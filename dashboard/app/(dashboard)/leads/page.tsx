"use client";

import { useEffect, useState } from "react";
import { RefreshCw, PhoneOff, Phone } from "lucide-react";

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

function statusColor(status: string) {
  const map: Record<string, string> = {
    new:         "text-sky-400",
    queued:      "text-amber-400",
    calling:     "text-amber-500",
    called:      "text-emerald-500",
    failed:      "text-red-500",
    do_not_call: "text-stone-600 line-through",
  };
  return map[status] ?? "text-stone-500";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load();
    const interval = setInterval(silentRefresh, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  async function load() {
    setLoading(true);
    const url = filter ? `/api/leads?status=${filter}` : "/api/leads";
    const res = await fetch(url);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }

  async function silentRefresh() {
    const url = filter ? `/api/leads?status=${filter}` : "/api/leads";
    const res = await fetch(url);
    const data = await res.json();
    if (data.leads) setLeads(data.leads);
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
      if (!res.ok) alert(data.error || "Action failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1">CRM</p>
          <h1 className="text-[22px] font-semibold text-stone-100 tracking-tight">Leads</h1>
        </div>
        <button
          onClick={load}
          className="p-2 text-stone-600 hover:text-stone-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-5 border-b border-[#181818] mb-6">
        {STATUSES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`pb-3 text-xs transition-colors ${
              filter === s
                ? "text-amber-500 border-b border-amber-500 -mb-px"
                : "text-stone-600 hover:text-stone-300"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-stone-600 text-sm py-8">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="text-stone-700 text-sm py-12 text-center border border-[#181818]">
          No leads yet. Connect an integration to start.
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center py-2 border-b border-[#181818]">
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-36">Name</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-36">Phone</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-24">Status</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-40">Outcome</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-16">Tries</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 ml-auto">Next retry</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-600 w-16 text-right">Act</span>
          </div>

          {leads.map((l) => (
            <div
              key={l.id}
              className="flex items-center py-3 border-b border-[#0F0F0F] hover:bg-[#0C0C0C] transition-colors"
            >
              <div className="w-36 shrink-0">
                <div className="text-sm text-stone-200 truncate">{l.name || "—"}</div>
                {l.email && <div className="text-[10px] text-stone-600 truncate">{l.email}</div>}
              </div>
              <span className="font-mono text-xs text-stone-400 w-36 shrink-0">{l.phone}</span>
              <span className={`text-xs w-24 shrink-0 ${statusColor(l.status)}`}>
                {l.status === "calling" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse align-middle" />
                )}
                {l.status}
              </span>
              <span className="text-xs text-stone-600 w-40 shrink-0 truncate">
                {l.outcome_code?.replace(/_/g, " ") || "—"}
              </span>
              <span className="text-xs text-stone-600 w-16 shrink-0">{l.attempts}</span>
              <span className="text-xs text-stone-700 ml-auto">
                {l.next_retry_at ? new Date(l.next_retry_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
              <div className="w-16 flex items-center justify-end gap-1 shrink-0">
                <button
                  disabled={busy === l.id || l.status === "do_not_call" || l.status === "calling" || l.status === "queued"}
                  onClick={() => act(l.id, "dispatch")}
                  className="p-1.5 text-emerald-600 hover:text-emerald-400 disabled:opacity-30 transition-colors"
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
                  className="p-1.5 text-stone-600 hover:text-stone-400 disabled:opacity-30 transition-colors"
                  title="Mark do-not-call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
