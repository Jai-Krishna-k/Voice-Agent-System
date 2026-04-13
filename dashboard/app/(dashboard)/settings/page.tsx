"use client";

import { useState, useEffect, ReactNode } from "react";
import {
  Save,
  Loader2,
  CheckCircle,
  Globe,
  Phone,
  PhoneIncoming,
  ShieldCheck,
  Plus,
  Trash2,
  Zap,
  Stethoscope,
  PhoneOutgoing,
  ChevronDown,
  Brain,
  Mic,
  Volume2,
  AlertTriangle,
} from "lucide-react";

interface SettingsState {
  livekit_url: string;
  livekit_api_key: string;
  livekit_api_secret: string;
  sip_trunk_id: string;
  sip_trunk_id_outbound: string;
  sip_trunk_id_inbound: string;
  sip_domain: string;
  default_transfer_number: string;
  // Model providers
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  groq_api_key: string;
  azure_openai_api_key: string;
  azure_openai_endpoint: string;
  azure_openai_deployment: string;
  xai_api_key: string;
  openrouter_api_key: string;
  mistral_api_key: string;
  // Voice / transcriber
  deepgram_api_key: string;
  sarvam_api_key: string;
}

const EMPTY_SETTINGS: SettingsState = {
  livekit_url: "",
  livekit_api_key: "",
  livekit_api_secret: "",
  sip_trunk_id: "",
  sip_trunk_id_outbound: "",
  sip_trunk_id_inbound: "",
  sip_domain: "",
  default_transfer_number: "",
  openai_api_key: "",
  anthropic_api_key: "",
  google_api_key: "",
  groq_api_key: "",
  azure_openai_api_key: "",
  azure_openai_endpoint: "",
  azure_openai_deployment: "",
  xai_api_key: "",
  openrouter_api_key: "",
  mistral_api_key: "",
  deepgram_api_key: "",
  sarvam_api_key: "",
};

interface PhoneNumber {
  id: string;
  phone_number: string;
  agent_config_id: string | null;
  agent_config_name: string;
  is_active: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS);
  const [hasKeys, setHasKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [newConfigId, setNewConfigId] = useState("");
  const [addingPhone, setAddingPhone] = useState(false);
  const [setupStatus, setSetupStatus] = useState("");
  const [creatingTrunk, setCreatingTrunk] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings({ ...EMPTY_SETTINGS, ...data.settings });
        if (data.hasKeys) setHasKeys(data.hasKeys);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/phone-numbers")
      .then((r) => r.json())
      .then((data) => {
        if (data.phoneNumbers) setPhoneNumbers(data.phoneNumbers);
      })
      .catch(() => {});

    fetch("/api/agent-config")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.configs || []) as Array<{ id: string; name: string; is_active?: boolean }>;
        setAgentConfigs(list.map((c) => ({ id: c.id, name: c.name || "Untitled" })));
        const active = list.find((c) => c.is_active);
        setNewConfigId(active?.id ?? list[0]?.id ?? "");
      })
      .catch(() => {});
  }, []);

  const updateField = (field: keyof SettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteKey = async (field: keyof SettingsState) => {
    setError("");
    try {
      const res = await fetch(`/api/settings?key=${field}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      const data = await res.json();
      setSettings((prev) => ({ ...prev, [field]: "" }));
      if (data.hasKeys) setHasKeys(data.hasKeys);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      if (data.settings) setSettings({ ...EMPTY_SETTINGS, ...data.settings });
      if (data.hasKeys) setHasKeys(data.hasKeys);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return;
    setAddingPhone(true);
    setError("");
    try {
      const res = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: newPhone.trim(),
          agent_config_id: newConfigId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add");
      }
      setNewPhone("");
      const listRes = await fetch("/api/phone-numbers");
      const listData = await listRes.json();
      if (listData.phoneNumbers) setPhoneNumbers(listData.phoneNumbers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingPhone(false);
    }
  };

  const handleDeletePhone = async (id: string) => {
    try {
      await fetch(`/api/phone-numbers?id=${id}`, { method: "DELETE" });
      setPhoneNumbers((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSetupInbound = async () => {
    const trunkId = settings.sip_trunk_id_inbound || settings.sip_trunk_id;
    if (!trunkId) {
      setError("Save your Inbound SIP Trunk ID first (or create one below)");
      return;
    }
    setSetupStatus("creating");
    setError("");
    try {
      const res = await fetch("/api/sip-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trunkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rule");
      setSetupStatus(data.message || "Dispatch rule ready");
      setTimeout(() => setSetupStatus(""), 5000);
    } catch (e: any) {
      setError(e.message);
      setSetupStatus("");
    }
  };

  const handleCreateInboundTrunk = async () => {
    const did = prompt("Enter the DID (E.164) that Vobiz will route to LiveKit:\n\ne.g. +919876543210");
    if (!did) return;
    setCreatingTrunk(true);
    setError("");
    try {
      const res = await fetch("/api/sip-trunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: did.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create trunk");
      setSettings((prev) => ({ ...prev, sip_trunk_id_inbound: data.trunkId }));
      setSetupStatus(`Inbound trunk created: ${data.trunkId}`);
      setTimeout(() => setSetupStatus(""), 5000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingTrunk(false);
    }
  };

  const handleDiagnoseInbound = async () => {
    setDiagnosing(true);
    setError("");
    setDiagnostics(null);
    try {
      const res = await fetch("/api/sip-diagnose");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Diagnosis failed");
      setDiagnostics(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = prompt(
      "This will permanently delete your account, all your calls, recordings, agent configs, and settings.\n\nType DELETE to confirm:"
    );
    if (confirm1 !== "DELETE") return;
    setDeletingAccount(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      // Server clears the session; bounce to root.
      window.location.href = "/login";
    } catch (e: any) {
      setError(e.message);
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-muted mt-1">Platform configuration and provider keys</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs bg-destructive/10 text-red-300 border border-destructive/20">
          {error}
        </div>
      )}

      <div className="space-y-4 max-w-3xl">
        <Section icon={<Globe className="w-4 h-4 text-accent" />} title="LiveKit Configuration" defaultOpen>
          <SettingsInput
            label="LiveKit URL"
            value={settings.livekit_url}
            onChange={(v) => updateField("livekit_url", v)}
            placeholder="wss://your-project.livekit.cloud"
          />
          <SettingsInput
            label="API Key"
            value={settings.livekit_api_key}
            onChange={(v) => updateField("livekit_api_key", v)}
            placeholder="API..."
            sensitive
            hasExisting={hasKeys.livekit_api_key}
            onDelete={() => handleDeleteKey("livekit_api_key")}
          />
          <SettingsInput
            label="API Secret"
            value={settings.livekit_api_secret}
            onChange={(v) => updateField("livekit_api_secret", v)}
            placeholder="Enter API secret"
            sensitive
            hasExisting={hasKeys.livekit_api_secret}
            onDelete={() => handleDeleteKey("livekit_api_secret")}
          />
        </Section>

        <Section icon={<Brain className="w-4 h-4 text-accent" />} title="Model Providers" defaultOpen>
          <SettingsInput
            label="OpenAI API Key"
            value={settings.openai_api_key}
            onChange={(v) => updateField("openai_api_key", v)}
            placeholder="sk-..."
            sensitive
            hasExisting={hasKeys.openai_api_key}
            onDelete={() => handleDeleteKey("openai_api_key")}
          />
          <SettingsInput
            label="Anthropic API Key"
            value={settings.anthropic_api_key}
            onChange={(v) => updateField("anthropic_api_key", v)}
            placeholder="sk-ant-..."
            sensitive
            hasExisting={hasKeys.anthropic_api_key}
            onDelete={() => handleDeleteKey("anthropic_api_key")}
          />
          <SettingsInput
            label="Google (Gemini) API Key"
            value={settings.google_api_key}
            onChange={(v) => updateField("google_api_key", v)}
            placeholder="AIza..."
            sensitive
            hasExisting={hasKeys.google_api_key}
            onDelete={() => handleDeleteKey("google_api_key")}
          />
          <SettingsInput
            label="Groq API Key"
            value={settings.groq_api_key}
            onChange={(v) => updateField("groq_api_key", v)}
            placeholder="gsk_..."
            sensitive
            hasExisting={hasKeys.groq_api_key}
            onDelete={() => handleDeleteKey("groq_api_key")}
          />
          <SettingsInput
            label="xAI API Key"
            value={settings.xai_api_key}
            onChange={(v) => updateField("xai_api_key", v)}
            placeholder="xai-..."
            sensitive
            hasExisting={hasKeys.xai_api_key}
            onDelete={() => handleDeleteKey("xai_api_key")}
          />
          <SettingsInput
            label="OpenRouter API Key"
            value={settings.openrouter_api_key}
            onChange={(v) => updateField("openrouter_api_key", v)}
            placeholder="sk-or-..."
            sensitive
            hasExisting={hasKeys.openrouter_api_key}
            onDelete={() => handleDeleteKey("openrouter_api_key")}
          />
          <SettingsInput
            label="Mistral API Key"
            value={settings.mistral_api_key}
            onChange={(v) => updateField("mistral_api_key", v)}
            placeholder="Enter Mistral key"
            sensitive
            hasExisting={hasKeys.mistral_api_key}
            onDelete={() => handleDeleteKey("mistral_api_key")}
          />
          <div className="pt-2 border-t border-card-border space-y-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Azure OpenAI</p>
            <SettingsInput
              label="Azure API Key"
              value={settings.azure_openai_api_key}
              onChange={(v) => updateField("azure_openai_api_key", v)}
              placeholder="Enter Azure key"
              sensitive
              hasExisting={hasKeys.azure_openai_api_key}
              onDelete={() => handleDeleteKey("azure_openai_api_key")}
            />
            <SettingsInput
              label="Azure Endpoint"
              value={settings.azure_openai_endpoint}
              onChange={(v) => updateField("azure_openai_endpoint", v)}
              placeholder="https://YOUR.openai.azure.com"
            />
            <SettingsInput
              label="Azure Deployment Name"
              value={settings.azure_openai_deployment}
              onChange={(v) => updateField("azure_openai_deployment", v)}
              placeholder="gpt-4o-mini"
            />
          </div>
        </Section>

        <Section icon={<Volume2 className="w-4 h-4 text-accent" />} title="Voice Providers" defaultOpen>
          <SettingsInput
            label="Sarvam API Key"
            value={settings.sarvam_api_key}
            onChange={(v) => updateField("sarvam_api_key", v)}
            placeholder="Enter Sarvam key"
            sensitive
            hasExisting={hasKeys.sarvam_api_key}
            onDelete={() => handleDeleteKey("sarvam_api_key")}
          />
          <p className="text-[11px] text-zinc-600">
            OpenAI voices (Alloy / Echo / Shimmer) reuse your OpenAI key from the Model Providers section.
          </p>
        </Section>

        <Section icon={<Mic className="w-4 h-4 text-accent" />} title="Transcriber Providers" defaultOpen>
          <SettingsInput
            label="Deepgram API Key"
            value={settings.deepgram_api_key}
            onChange={(v) => updateField("deepgram_api_key", v)}
            placeholder="Enter Deepgram key"
            sensitive
            hasExisting={hasKeys.deepgram_api_key}
            onDelete={() => handleDeleteKey("deepgram_api_key")}
          />
        </Section>

        <Section icon={<Phone className="w-4 h-4 text-accent" />} title="Phone Number Providers" defaultOpen>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <SettingsInput
                  label="Outbound SIP Trunk ID"
                  value={settings.sip_trunk_id_outbound || settings.sip_trunk_id}
                  onChange={(v) => updateField("sip_trunk_id_outbound", v)}
                  placeholder="ST_..."
                />
              </div>
              <PhoneOutgoing className="w-3.5 h-3.5 text-zinc-600 mt-7" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SettingsInput
                  label="Inbound SIP Trunk ID"
                  value={settings.sip_trunk_id_inbound}
                  onChange={(v) => updateField("sip_trunk_id_inbound", v)}
                  placeholder="ST_..."
                />
              </div>
              <button
                type="button"
                onClick={handleCreateInboundTrunk}
                disabled={creatingTrunk}
                className="px-3 py-2.5 text-[11px] font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                {creatingTrunk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </button>
            </div>
            <SettingsInput
              label="SIP Domain"
              value={settings.sip_domain}
              onChange={(v) => updateField("sip_domain", v)}
              placeholder="sip.vobiz.ai"
            />
            <SettingsInput
              label="Default Transfer Number"
              value={settings.default_transfer_number}
              onChange={(v) => updateField("default_transfer_number", v)}
              placeholder="+919876543210"
              type="tel"
            />
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              To receive inbound calls, configure Vobiz to route your DID to LiveKit's SIP URI.
            </p>
          </div>
        </Section>

        <Section icon={<PhoneIncoming className="w-4 h-4 text-accent" />} title="Inbound Phone Number Mapping" defaultOpen>
          <div className="flex items-center justify-end gap-2 -mt-2">
            <button
              onClick={handleDiagnoseInbound}
              disabled={diagnosing}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-card-border transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {diagnosing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
              Diagnose
            </button>
            <button
              onClick={handleSetupInbound}
              disabled={setupStatus === "creating"}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {setupStatus === "creating" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Setup Inbound
            </button>
          </div>

          {diagnostics && (
            <div className="p-3 rounded-lg text-[11px] bg-surface border border-card-border space-y-2 font-mono">
              <div>
                <span className="text-zinc-500">Inbound trunks: </span>
                <span className="text-zinc-300">{diagnostics.inboundTrunks?.length ?? 0}</span>
                {(diagnostics.inboundTrunks || []).map((t: any) => (
                  <div key={t.sipTrunkId} className="pl-3 text-zinc-400">
                    {t.sipTrunkId} · {t.name || "—"} · [{(t.numbers || []).join(", ")}]
                  </div>
                ))}
              </div>
              <div>
                <span className="text-zinc-500">Dispatch rules: </span>
                <span className="text-zinc-300">{diagnostics.dispatchRules?.length ?? 0}</span>
                {(diagnostics.dispatchRules || []).map((r: any) => (
                  <div key={r.sipDispatchRuleId} className="pl-3 text-zinc-400">
                    {r.sipDispatchRuleId} · trunks=[{(r.trunkIds || []).join(", ")}]
                  </div>
                ))}
              </div>
              <div>
                <span className="text-zinc-500">Mapped numbers: </span>
                <span className="text-zinc-300">{diagnostics.phoneNumbers?.length ?? 0}</span>
                {(diagnostics.phoneNumbers || []).map((p: any) => (
                  <div key={p.id} className="pl-3 text-zinc-400">
                    {p.phone_number} → {p.agent_config_name || "—"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {setupStatus && setupStatus !== "creating" && (
            <div className="p-2 rounded-lg text-[11px] bg-green-500/10 text-green-400 border border-green-500/20">
              {setupStatus}
            </div>
          )}

          {phoneNumbers.length > 0 && (
            <div className="space-y-2">
              {phoneNumbers.map((pn) => (
                <div
                  key={pn.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface rounded-lg border border-card-border"
                >
                  <div>
                    <span className="text-sm text-white font-mono">{pn.phone_number}</span>
                    <span className="text-[11px] text-muted ml-3">→ {pn.agent_config_name}</span>
                  </div>
                  <button
                    onClick={() => handleDeletePhone(pn.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+919876543210"
              className="flex-1 px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
            />
            <select
              value={newConfigId}
              onChange={(e) => setNewConfigId(e.target.value)}
              className="px-3 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white outline-none focus:border-accent transition-colors"
            >
              <option value="">No agent</option>
              {agentConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddPhone}
              disabled={addingPhone || !newPhone.trim()}
              className="px-3 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {addingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </Section>

        <div className="bg-card border border-red-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-medium text-red-300">Danger Zone</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Permanently delete your account, all calls, recordings, agent configs, and settings.
            This cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Account
          </button>
        </div>

        <div className="flex items-start gap-2 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-600">
            Keys are stored in Supabase with row-level security. Only you can access your settings.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  sensitive = false,
  hasExisting = false,
  onDelete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  sensitive?: boolean;
  hasExisting?: boolean;
  onDelete?: () => void;
}) {
  const isMasked = sensitive && value.startsWith("••••");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-400">{label}</label>
        {sensitive && hasExisting && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-green-400/70 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Saved
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Delete saved key"
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
      <input
        type={sensitive ? "password" : type}
        value={isMasked ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isMasked ? "Key saved — enter new value to replace" : placeholder}
        className="w-full px-3.5 py-2.5 bg-surface border border-card-border rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}
