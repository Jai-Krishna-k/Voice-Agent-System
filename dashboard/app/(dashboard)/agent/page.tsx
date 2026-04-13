"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Save,
  Loader2,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  greeting: string;
  voice_id: string;
  model_provider: string;
  is_active: boolean;
}

const BLANK_CONFIG: Omit<AgentConfig, "id"> = {
  name: "New Agent",
  system_prompt: "",
  greeting: "",
  voice_id: "anushka",
  model_provider: "openai",
  is_active: false,
};

export default function AgentConfigPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AgentConfig, "id" | "is_active">>({
    ...BLANK_CONFIG,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadConfigs = async (selectAfter?: string) => {
    try {
      const res = await fetch("/api/agent-config");
      const data = await res.json();
      const list: AgentConfig[] = data.configs || [];
      setConfigs(list);

      // Pick selection: explicit selectAfter → keep current if still exists → active → first
      const nextId =
        selectAfter ??
        (selectedId && list.find((c) => c.id === selectedId)
          ? selectedId
          : list.find((c) => c.is_active)?.id ?? list[0]?.id ?? null);

      if (nextId) {
        const picked = list.find((c) => c.id === nextId);
        if (picked) {
          setSelectedId(picked.id);
          setForm({
            name: picked.name || "",
            system_prompt: picked.system_prompt || "",
            greeting: picked.greeting || "",
            voice_id: picked.voice_id || "anushka",
            model_provider: picked.model_provider || "openai",
          });
        }
      } else {
        setSelectedId(null);
        setForm({ ...BLANK_CONFIG });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (c: AgentConfig) => {
    setSelectedId(c.id);
    setForm({
      name: c.name || "",
      system_prompt: c.system_prompt || "",
      greeting: c.greeting || "",
      voice_id: c.voice_id || "anushka",
      model_provider: c.model_provider || "openai",
    });
    setSaved(false);
    setError("");
  };

  const handleNew = async () => {
    setError("");
    try {
      const res = await fetch("/api/agent-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BLANK_CONFIG),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      const { config } = await res.json();
      await loadConfigs(config.id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/agent-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      await loadConfigs(selectedId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent config?")) return;
    setError("");
    try {
      const res = await fetch(`/api/agent-config?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      if (selectedId === id) setSelectedId(null);
      await loadConfigs();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleActivate = async (id: string) => {
    setError("");
    try {
      const res = await fetch("/api/agent-config/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to activate");
      }
      await loadConfigs(id);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  const selected = configs.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agent Config</h1>
          <p className="text-sm text-muted mt-1">
            Create and manage multiple agent personalities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-card-border text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Config
          </button>
          {selected && !selected.is_active && (
            <button
              onClick={() => handleActivate(selected.id)}
              className="px-3 py-2 bg-white/5 hover:bg-green-500/15 border border-card-border hover:border-green-500/40 text-green-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Set as Active
            </button>
          )}
          {selected && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "Saved" : "Save Config"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs bg-destructive/10 text-red-300 border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: list of configs */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-[11px] font-medium text-muted uppercase tracking-wider px-1 mb-2">
            Your Agents ({configs.length})
          </h2>
          {configs.length === 0 ? (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center">
              <Bot className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-muted">No agents yet</p>
              <button
                onClick={handleNew}
                className="mt-3 text-xs text-accent hover:underline"
              >
                Create your first agent
              </button>
            </div>
          ) : (
            configs.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                  selectedId === c.id
                    ? "bg-accent/10 border-accent/40"
                    : "bg-card border-card-border hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {c.name || "Untitled"}
                      </span>
                      {c.is_active && (
                        <span className="text-[9px] font-semibold uppercase bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted mt-1 capitalize">
                      {c.voice_id || "—"} · {c.model_provider || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      title="Delete"
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: editor */}
        <div className="lg:col-span-2 space-y-5">
          {!selected ? (
            <div className="bg-card border border-card-border rounded-xl p-12 text-center">
              <Bot className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-muted">
                Select an agent from the list or create a new one
              </p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Agent Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Default Agent"
                    className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-medium text-zinc-300">
                    System Prompt
                  </h2>
                </div>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, system_prompt: e.target.value }))
                  }
                  placeholder={`You are a helpful voice assistant for...

Define your agent's personality, role, and behavior here. This is the core instruction set that drives every call.`}
                  className="w-full px-3.5 py-3 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors h-56 resize-y font-mono leading-relaxed"
                />
              </div>

              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-medium text-zinc-300">
                  Opening Greeting
                </h2>
                <textarea
                  value={form.greeting}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, greeting: e.target.value }))
                  }
                  placeholder="Hi there! I'm calling from..."
                  className="w-full px-3.5 py-3 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors h-20 resize-none"
                />
                <p className="text-[11px] text-zinc-600">
                  The first thing the agent says when the call is answered
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-medium text-zinc-300">Voice</h2>
                  <select
                    value={form.voice_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, voice_id: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white outline-none focus:border-accent transition-colors"
                  >
                    <optgroup label="Sarvam (Indian)">
                      <option value="anushka">Anushka (F)</option>
                      <option value="manisha">Manisha (F)</option>
                      <option value="vidya">Vidya (F)</option>
                      <option value="arya">Arya (F)</option>
                      <option value="abhilash">Abhilash (M)</option>
                      <option value="karun">Karun (M)</option>
                      <option value="hitesh">Hitesh (M)</option>
                    </optgroup>
                    <optgroup label="OpenAI (US)">
                      <option value="alloy">Alloy</option>
                      <option value="echo">Echo</option>
                      <option value="fable">Fable</option>
                      <option value="onyx">Onyx</option>
                      <option value="nova">Nova</option>
                      <option value="shimmer">Shimmer</option>
                    </optgroup>
                  </select>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-medium text-zinc-300">
                    LLM Provider
                  </h2>
                  <select
                    value={form.model_provider}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, model_provider: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white outline-none focus:border-accent transition-colors"
                  >
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic (Claude Haiku)</option>
                    <option value="google">Google (Gemini 2.0 Flash)</option>
                    <option value="groq">Groq (Llama 3.3 70B)</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="xai">xAI (Grok)</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="mistral">Mistral</option>
                  </select>
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-300 mb-2">
                  How It Works
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  You can create multiple agents and switch between them. The{" "}
                  <span className="text-green-400">Active</span> agent is used
                  as the default for outbound calls. On the New Call page you
                  can pick any agent per call. For inbound calls, map phone
                  numbers to specific agents in Settings.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
