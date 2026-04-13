"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Copy, ExternalLink, AlertCircle, KeyRound } from "lucide-react";

interface WebhookInfo {
  url: string;
  secret: string;
}

export default function HubSpotSetupPage() {
  return (
    <Suspense>
      <HubSpotSetup />
    </Suspense>
  );
}

function HubSpotSetup() {
  const params = useSearchParams();
  const router = useRouter();
  const sourceId = params.get("id");

  const [step, setStep] = useState<"token" | "config" | "webhook">(
    sourceId ? "config" : "token"
  );
  const [token, setToken] = useState("");
  const [displayName, setDisplayName] = useState("HubSpot CRM");
  const [portalName, setPortalName] = useState<string | null>(null);
  const [credentialsRef, setCredentialsRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSourceId, setSavedSourceId] = useState<string | null>(sourceId);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);

  useEffect(() => {
    if (sourceId) loadExisting(sourceId);
  }, [sourceId]);

  async function loadExisting(id: string) {
    const res = await fetch(`/api/lead-sources/${id}`);
    const data = await res.json();
    if (data.source) {
      setDisplayName(data.source.display_name || "HubSpot CRM");
      setPortalName(data.source.config?.hub_domain ?? null);
    }
  }

  async function verifyToken() {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-sources/hubspot/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token verification failed");
      setCredentialsRef(data.credentials_ref);
      setPortalName(data.portal_name ?? null);
      setStep("config");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createSource() {
    if (!credentialsRef) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "hubspot",
          display_name: displayName,
          credentials_ref: credentialsRef,
          config: {},
          field_mapping: { phone: "phone", name: "name", email: "email" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedSourceId(data.source.id);

      const wRes = await fetch(`/api/lead-sources/${data.source.id}/webhook-info`);
      if (wRes.ok) setWebhookInfo(await wRes.json());
      setStep("webhook");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateSource() {
    if (!savedSourceId) return;
    setLoading(true);
    try {
      await fetch(`/api/lead-sources/${savedSourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      const wRes = await fetch(`/api/lead-sources/${savedSourceId}/webhook-info`);
      if (wRes.ok) setWebhookInfo(await wRes.json());
      setStep("webhook");
    } finally {
      setLoading(false);
    }
  }

  const STEPS = ["token", "config", "webhook"] as const;
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link
        href="/integrations"
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Integrations
      </Link>

      <h1 className="text-2xl font-semibold text-white mb-2">Connect HubSpot</h1>
      <p className="text-sm text-zinc-500 mb-8">
        New HubSpot contacts will be called automatically. Call outcomes are written back as
        contact notes and properties.
      </p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {(["token", "config", "webhook"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s
                  ? "bg-accent text-white"
                  : i < stepIdx
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/[0.05] text-zinc-500"
              }`}
            >
              {i < stepIdx ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs ${step === s ? "text-zinc-200" : "text-zinc-500"}`}>
              {s === "token" ? "API Token" : s === "config" ? "Configure" : "Webhook"}
            </span>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Paste Private App token ─────────────────────────── */}
      {step === "token" && (
        <div className="space-y-5 max-w-xl">
          <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-zinc-300 space-y-3">
            <p className="font-medium flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" /> Create a HubSpot Private App token
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
              <li>
                In HubSpot go to{" "}
                <span className="text-zinc-200">Settings → Integrations → Private Apps</span>
              </li>
              <li>Click <span className="text-zinc-200">Create a private app</span></li>
              <li>
                Under <span className="text-zinc-200">Scopes</span>, enable:
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li><code className="text-xs text-zinc-300">crm.objects.contacts.read</code></li>
                  <li><code className="text-xs text-zinc-300">crm.objects.contacts.write</code></li>
                  <li><code className="text-xs text-zinc-300">crm.objects.notes.write</code></li>
                </ul>
              </li>
              <li>Click <span className="text-zinc-200">Create app</span> → copy the token</li>
            </ol>
            <a
              href="https://developers.hubspot.com/docs/api/private-apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              HubSpot Private Apps guide <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Private App token</label>
            <input
              className="input font-mono"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            onClick={verifyToken}
            disabled={loading || !token.trim()}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify & continue
          </button>
        </div>
      )}

      {/* ── Step 2: Config ───────────────────────────────────────────── */}
      {step === "config" && (
        <div className="space-y-5 max-w-xl">
          {portalName && (
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Connected to <span className="font-medium ml-1">{portalName}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. HubSpot — Inbound Leads"
            />
          </div>

          <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-zinc-400">
            Field mapping is automatic — HubSpot contacts have standard fields (firstname,
            lastname, email, phone). New contacts sync every 5 minutes.
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            onClick={savedSourceId ? updateSource : createSource}
            disabled={loading || !displayName}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & continue
          </button>
        </div>
      )}

      {/* ── Step 3: Webhook (optional) ───────────────────────────────── */}
      {step === "webhook" && (
        <div className="space-y-5">
          <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" /> HubSpot connected. Polling picks up new contacts every
            5 minutes automatically.
          </div>

          <div className="text-sm text-zinc-300 font-medium">
            Optional: Real-time webhooks (sub-second dispatch)
          </div>

          <p className="text-sm text-zinc-500">
            Register our URL as a webhook in your HubSpot Private App so calls fire instantly when
            a contact is created, instead of waiting up to 5 minutes.
          </p>

          <ol className="space-y-3">
            {[
              <>
                In HubSpot go to{" "}
                <span className="text-zinc-200">
                  Settings → Integrations → Private Apps → your app
                </span>
              </>,
              <>
                Click the <span className="text-zinc-200">Webhooks</span> tab → Add subscription
              </>,
              <>
                Event type: <code className="text-zinc-200 text-xs">contact.creation</code> ·
                Target URL: copy from below
              </>,
              <>
                Signing secret: copy from below and paste into HubSpot's signing secret field
              </>,
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-300">{text}</span>
              </li>
            ))}
          </ol>

          {webhookInfo ? (
            <div className="space-y-2 text-xs mt-2">
              <CodeBox label="Target URL" value={webhookInfo.url} />
              <CodeBox label="Signing secret" value={webhookInfo.secret} />
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Loading webhook info…</div>
          )}

          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Webhooks require a public HTTPS URL — they won't work on localhost. Deploy to Vercel
            first, then update this URL in HubSpot.
          </div>

          <button
            onClick={() => router.push("/integrations")}
            className="px-5 py-2.5 rounded-lg bg-white/[0.05] text-white hover:bg-white/[0.08]"
          >
            Done
          </button>
        </div>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(99, 102, 241);
        }
      `}</style>
    </div>
  );
}

function CodeBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="p-3 rounded border border-white/10 bg-black/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-500">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="text-zinc-200 break-all font-mono">{value}</div>
    </div>
  );
}
