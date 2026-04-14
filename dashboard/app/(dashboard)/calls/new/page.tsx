"use client";

import { useState, useEffect } from "react";
import { Phone, MessageSquare, Loader2, Users, Bot } from "lucide-react";

type Tab = "single" | "bulk";

interface AgentConfigLite {
  id: string;
  name: string;
  voice_id: string;
  model_provider: string;
  is_active: boolean;
}

function useAgentConfigs() {
  const [configs, setConfigs] = useState<AgentConfigLite[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agent-config");
        const data = await res.json();
        const list: AgentConfigLite[] = data.configs || [];
        setConfigs(list);
        const active = list.find((c) => c.is_active);
        setSelectedId(active?.id ?? list[0]?.id ?? "");
      } catch { /* ignore */ }
    })();
  }, []);

  return { configs, selectedId, setSelectedId };
}

const inputCls =
  "w-full bg-[#0C0C0C] border border-[#1E1E1E] text-stone-200 text-sm px-3 py-2.5 placeholder-stone-700 focus:outline-none focus:border-amber-500/60 transition-colors";

export default function NewCallPage() {
  const [tab, setTab] = useState<Tab>("single");

  return (
    <div className="px-10 py-8 max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1">Outbound</p>
        <h1 className="text-[22px] font-semibold text-stone-100 tracking-tight">Dispatch</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[#181818] mb-7">
        {(["single", "bulk"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm transition-colors ${
              tab === t
                ? "text-stone-100 border-b-2 border-amber-500 -mb-px"
                : "text-stone-600 hover:text-stone-300"
            }`}
          >
            {t === "single" ? "Single Call" : "Bulk Campaign"}
          </button>
        ))}
      </div>

      {tab === "single" ? <SingleCallForm /> : <BulkCallForm />}
    </div>
  );
}

function SingleCallForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { configs, selectedId: agentConfigId, setSelectedId: setAgentConfigId } = useAgentConfigs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, prompt, agentConfigId: agentConfigId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(`Call dispatched to ${phoneNumber}`);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to dispatch call");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Network error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Phone className="w-3 h-3" /> Phone Number
        </label>
        <input
          type="tel"
          placeholder="+919876543210"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Bot className="w-3 h-3" /> Agent
        </label>
        {configs.length === 0 ? (
          <div className="text-[11px] text-stone-700 px-3 py-2.5 border border-[#1E1E1E] bg-[#0C0C0C]">
            No agent configs found.{" "}
            <a href="/agent" className="text-amber-500 hover:underline">Create one</a>
          </div>
        ) : (
          <select
            value={agentConfigId}
            onChange={(e) => setAgentConfigId(e.target.value)}
            className={inputCls}
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.is_active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Call Context <span className="text-stone-700">(optional)</span>
        </label>
        <textarea
          placeholder="e.g. Calling Ravi about his missed coffee order #4521..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={`${inputCls} h-24 resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[13px] px-5 py-2.5 w-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching…</>
        ) : "Initiate Call"}
      </button>

      {message && (
        <div className={`p-3 text-xs text-center border ${
          status === "success"
            ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
            : "border-red-500/20 text-red-400 bg-red-500/5"
        }`}>
          {message}
        </div>
      )}
    </form>
  );
}

function BulkCallForm() {
  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [results, setResults] = useState<any[]>([]);
  const { configs, selectedId: agentConfigId, setSelectedId: setAgentConfigId } = useAgentConfigs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setResults([]);
    const numbers = input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (!numbers.length) { setStatus("error"); return; }
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers, prompt, agentConfigId: agentConfigId || null }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setStatus(res.ok ? "success" : "error");
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Phone Numbers
        </label>
        <textarea
          placeholder={"+919876543210\n+919988776655\n+12125551234"}
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`${inputCls} h-28 resize-none font-mono`}
        />
        <p className="text-[11px] text-stone-700">Separate by comma or new line</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Bot className="w-3 h-3" /> Agent
        </label>
        {configs.length === 0 ? (
          <div className="text-[11px] text-stone-700 px-3 py-2.5 border border-[#1E1E1E] bg-[#0C0C0C]">
            No agent configs.{" "}
            <a href="/agent" className="text-amber-500 hover:underline">Create one</a>
          </div>
        ) : (
          <select
            value={agentConfigId}
            onChange={(e) => setAgentConfigId(e.target.value)}
            className={inputCls}
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.is_active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Campaign Context <span className="text-stone-700">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Survey about recent purchase..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[13px] px-5 py-2.5 w-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : "Launch Campaign"}
      </button>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 border border-[#1E1E1E] bg-[#0C0C0C] text-xs">
              <span className="font-mono text-stone-300">{r.phoneNumber}</span>
              <span className={r.status === "dispatched" ? "text-emerald-500" : "text-red-500"}>
                {r.status === "dispatched" ? "Sent" : "Failed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
