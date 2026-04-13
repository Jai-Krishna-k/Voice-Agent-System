"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  MessageSquare,
  Loader2,
  Users,
  PhoneOutgoing,
  Bot,
} from "lucide-react";

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
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return { configs, selectedId, setSelectedId };
}

export default function NewCallPage() {
  const [tab, setTab] = useState<Tab>("single");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">New Call</h1>
        <p className="text-sm text-muted mt-1">
          Dispatch an AI agent to make outbound calls
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-card border border-card-border rounded-lg w-fit">
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "single"
              ? "bg-white/10 text-white"
              : "text-muted hover:text-zinc-300"
          }`}
        >
          <PhoneOutgoing className="w-3.5 h-3.5 inline mr-2" />
          Single Call
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "bulk"
              ? "bg-white/10 text-white"
              : "text-muted hover:text-zinc-300"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-2" />
          Bulk Campaign
        </button>
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
  const { configs, selectedId: agentConfigId, setSelectedId: setAgentConfigId } =
    useAgentConfigs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          prompt,
          agentConfigId: agentConfigId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(`Call dispatched to ${phoneNumber} — Room: ${data.roomName}`);
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
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-card-border rounded-xl p-6 max-w-lg space-y-5"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" /> Phone Number
        </label>
        <input
          type="tel"
          placeholder="+919876543210"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5" /> Agent
        </label>
        {configs.length === 0 ? (
          <div className="text-[11px] text-zinc-600 px-3.5 py-2.5 bg-surface border border-card-border rounded-lg">
            No agent configs found.{" "}
            <a href="/agent" className="text-accent hover:underline">
              Create one
            </a>
          </div>
        ) : (
          <select
            value={agentConfigId}
            onChange={(e) => setAgentConfigId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white outline-none focus:border-accent transition-colors"
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>
        )}
        <p className="text-[11px] text-zinc-600">
          The selected agent's system prompt, voice, and model will be used.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Call Context (optional)
        </label>
        <textarea
          placeholder="e.g. Calling Ravi about his missed coffee order #4521..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors h-24 resize-none"
        />
        <p className="text-[11px] text-zinc-600">
          Added to the agent's system prompt as call-specific context.
        </p>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
          </>
        ) : (
          "Initiate Call"
        )}
      </button>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs text-center border ${
            status === "success"
              ? "bg-success/10 text-green-300 border-success/20"
              : "bg-destructive/10 text-red-300 border-destructive/20"
          }`}
        >
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
  const { configs, selectedId: agentConfigId, setSelectedId: setAgentConfigId } =
    useAgentConfigs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setResults([]);

    const numbers = input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (numbers.length === 0) {
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers,
          prompt,
          agentConfigId: agentConfigId || null,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-card-border rounded-xl p-6 max-w-lg space-y-5"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Phone Numbers
        </label>
        <textarea
          placeholder={"+919876543210\n+919988776655\n+12125551234"}
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors h-28 resize-none font-mono"
        />
        <p className="text-[11px] text-zinc-600">
          Separate by comma or new line
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5" /> Agent
        </label>
        {configs.length === 0 ? (
          <div className="text-[11px] text-zinc-600 px-3.5 py-2.5 bg-surface border border-card-border rounded-lg">
            No agent configs found.{" "}
            <a href="/agent" className="text-accent hover:underline">
              Create one
            </a>
          </div>
        ) : (
          <select
            value={agentConfigId}
            onChange={(e) => setAgentConfigId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white outline-none focus:border-accent transition-colors"
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Campaign Context (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Survey about recent purchase..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing Queue...
          </>
        ) : (
          "Launch Campaign"
        )}
      </button>

      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1.5">
          {results.map((res, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface text-xs"
            >
              <span className="font-mono text-zinc-300">
                {res.phoneNumber}
              </span>
              <span
                className={
                  res.status === "dispatched"
                    ? "text-success"
                    : "text-destructive"
                }
              >
                {res.status === "dispatched" ? "Sent" : "Failed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
