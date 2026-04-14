"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Phone,
  PhoneOff,
  RotateCw,
  RefreshCw,
  User,
  Mail,
  Clock,
  Target,
} from "lucide-react";
import { MagneticFocusRing } from "@/components/motion/MagneticFocusRing";
import { FlashOnChange } from "@/components/motion/FlashOnChange";
import { BreathingDot } from "@/components/motion/BreathingDot";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useFocusList } from "@/hooks/useFocusList";

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

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "queued", label: "Queued" },
  { key: "calling", label: "Calling" },
  { key: "called", label: "Called" },
  { key: "failed", label: "Failed" },
  { key: "do_not_call", label: "DNC" },
];

function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "text-sky-400",
    queued: "text-amber-400",
    calling: "text-amber-500",
    called: "text-emerald-500",
    failed: "text-red-400",
    do_not_call: "text-stone-700",
  };
  return map[status] ?? "text-stone-500";
}

function fmtTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return leads;
    const q = query.toLowerCase();
    return leads.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q),
    );
  }, [leads, query]);

  const focus = useFocusList(filtered);
  const selected = focus.focused;

  useEffect(() => {
    load();
    const interval = setInterval(silentRefresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function load() {
    setLoading(true);
    const url = filter ? `/api/leads?status=${filter}` : "/api/leads";
    try {
      const res = await fetch(url);
      const data = await res.json();
      setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  }

  async function silentRefresh() {
    const url = filter ? `/api/leads?status=${filter}` : "/api/leads";
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch {
      /* ignore */
    }
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

  useKeyboardShortcuts(
    {
      j: (e) => {
        e.preventDefault();
        focus.move(1);
      },
      k: (e) => {
        e.preventDefault();
        focus.move(-1);
      },
      arrowdown: (e) => {
        e.preventDefault();
        focus.move(1);
      },
      arrowup: (e) => {
        e.preventDefault();
        focus.move(-1);
      },
      c: (e) => {
        if (!selected) return;
        e.preventDefault();
        act(selected.id, "dispatch");
      },
      d: (e) => {
        if (!selected) return;
        e.preventDefault();
        act(selected.id, "do_not_call");
      },
      r: (e) => {
        if (!selected) return;
        e.preventDefault();
        act(selected.id, "retry");
      },
    },
    [focus, selected],
  );

  const counts: Record<string, number> = {};
  for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;

  return (
    <div className="h-full flex min-h-0">
      {/* Filter rail */}
      <div className="w-48 shrink-0 flex flex-col"
        style={{ background: "#070707", borderRight: "1px solid #141414" }}>
        <div className="h-10 px-3 flex items-center shrink-0"
          style={{ borderBottom: "1px solid #141414" }}>
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Filter
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {FILTERS.map((f) => {
            const n = f.key === "" ? leads.length : counts[f.key] ?? 0;
            const active = filter === f.key;
            return (
              <button
                key={f.key || "all"}
                onClick={() => setFilter(f.key)}
                className={`w-full flex items-center px-4 py-2 text-[12px] transition-colors ${
                  active
                    ? "text-amber-500 bg-amber-500/[0.06] border-l-2 border-amber-500"
                    : "text-stone-500 hover:text-stone-200 border-l-2 border-transparent"
                }`}
              >
                <span className="flex-1 text-left">{f.label}</span>
                <span className="text-[10px] font-mono text-stone-700">{n}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={load}
          className="h-9 flex items-center justify-center gap-1.5 text-[10px] text-stone-600 hover:text-amber-500 uppercase tracking-widest transition-colors shrink-0"
          style={{ borderTop: "1px solid #141414" }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* List */}
      <div className="w-[28rem] shrink-0 flex flex-col min-h-0"
        style={{ borderRight: "1px solid #141414" }}>
        <div className="h-10 px-3 flex items-center gap-2 shrink-0"
          style={{ borderBottom: "1px solid #141414" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search / filter…"
            className="flex-1 h-6 px-2 bg-transparent text-[12px] text-stone-300 placeholder-stone-700 outline-none border border-[#141414]"
          />
          <div className="text-[10px] text-stone-700 font-mono-tabular tabular-nums">
            {filtered.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {loading && leads.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-stone-700 uppercase tracking-widest">
              loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-stone-700 uppercase tracking-widest px-6">
              no leads. connect an integration to start.
            </div>
          ) : (
            filtered.map((l, i) => {
              const active = focus.index === i;
              return (
                <button
                  key={l.id}
                  onMouseEnter={() => focus.setIndex(i)}
                  onClick={() => focus.setIndex(i)}
                  className="relative w-full text-left px-3 py-2.5 flex items-center gap-2 group"
                  style={{ borderBottom: "1px solid #0F0F0F" }}
                >
                  {active && <MagneticFocusRing layoutId="leads-focus" />}
                  <FlashOnChange value={l.status} className="flex-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-1.5">
                      {l.status === "calling" && <BreathingDot color="#F59E0B" size={4} />}
                      <div className="text-[12px] text-stone-200 truncate font-medium">
                        {l.name || "Unnamed lead"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-[11px] font-mono-tabular text-stone-500 truncate">
                        {l.phone}
                      </div>
                      <div className={`text-[10px] uppercase tracking-wider ${statusColor(l.status)}`}>
                        {l.status}
                      </div>
                    </div>
                  </FlashOnChange>
                  <div className="text-[10px] text-stone-700 font-mono-tabular relative z-10">
                    {l.attempts}×
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="p-10 flex flex-col gap-8 max-w-2xl"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600 mb-1">
                  Lead
                </div>
                <h1 className="text-[26px] font-semibold text-stone-100 tracking-tight">
                  {selected.name || "Unnamed lead"}
                </h1>
                <div className={`mt-1 text-[11px] uppercase tracking-widest ${statusColor(selected.status)}`}>
                  {selected.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field icon={Phone} label="Phone" value={selected.phone} mono />
                <Field icon={Mail} label="Email" value={selected.email ?? "—"} />
                <Field icon={User} label="Attempts" value={selected.attempts.toString()} />
                <Field icon={Target} label="Outcome" value={selected.outcome_code?.replace(/_/g, " ") ?? "—"} />
                <Field icon={Clock} label="Last called" value={fmtTime(selected.last_called_at)} />
                <Field icon={Clock} label="Next retry" value={fmtTime(selected.next_retry_at)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton
                  disabled={busy === selected.id || ["do_not_call", "calling", "queued"].includes(selected.status)}
                  onClick={() => act(selected.id, "dispatch")}
                  icon={Phone}
                  label="Call now"
                  kbd="C"
                  variant="primary"
                />
                <ActionButton
                  disabled={busy === selected.id}
                  onClick={() => act(selected.id, "retry")}
                  icon={RotateCw}
                  label="Retry"
                  kbd="R"
                />
                <ActionButton
                  disabled={busy === selected.id}
                  onClick={() => act(selected.id, "do_not_call")}
                  icon={PhoneOff}
                  label="Do not call"
                  kbd="D"
                  variant="danger"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center text-[11px] text-stone-700 uppercase tracking-widest"
            >
              select a lead to see details
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-2" style={{ borderBottom: "1px solid #141414" }}>
      <Icon className="w-3.5 h-3.5 text-stone-700 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-stone-700">{label}</div>
        <div className={`text-[13px] text-stone-200 truncate ${mono ? "font-mono-tabular" : ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  kbd,
  onClick,
  disabled,
  variant = "default",
}: {
  icon: typeof Phone;
  label: string;
  kbd: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "default" | "danger";
}) {
  const base = "flex items-center gap-2 h-9 px-3.5 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-30";
  const styles =
    variant === "primary"
      ? "bg-amber-500 text-black hover:bg-amber-400 font-semibold"
      : variant === "danger"
      ? "text-red-400 hover:text-red-300"
      : "text-stone-400 hover:text-stone-200";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
      style={
        variant === "primary"
          ? undefined
          : { background: "#0A0A0A", border: "1px solid #1E1E1E" }
      }
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <kbd className={`font-mono text-[9px] px-1 py-[1px] border ${
        variant === "primary" ? "border-black/30" : "border-[#1a1a1a]"
      }`}>
        {kbd}
      </kbd>
    </button>
  );
}
