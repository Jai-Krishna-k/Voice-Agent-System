"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Copy } from "lucide-react";

interface PreviewResult {
  columns: string[];
  sample: any[];
  suggested: { phone?: string; name?: string; email?: string };
}

export default function GoogleSheetsSetupPage() {
  return (
    <Suspense>
      <GoogleSheetsSetup />
    </Suspense>
  );
}

function GoogleSheetsSetup() {
  const params = useSearchParams();
  const router = useRouter();
  const credentialsRef = params.get("credentials_ref");
  const sourceId = params.get("id");

  const [step, setStep] = useState<"auth" | "config" | "mapping" | "apps-script">(
    credentialsRef || sourceId ? "config" : "auth"
  );
  const [displayName, setDisplayName] = useState("My Sheet");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [tab, setTab] = useState("Sheet1");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<{ phone: string; name: string; email: string }>({
    phone: "",
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSourceId, setSavedSourceId] = useState<string | null>(sourceId);
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; secret: string } | null>(null);

  useEffect(() => {
    if (sourceId) loadExisting(sourceId);
  }, [sourceId]);

  async function loadExisting(id: string) {
    const res = await fetch(`/api/lead-sources/${id}`);
    const data = await res.json();
    if (data.source) {
      setDisplayName(data.source.display_name || "");
      setSpreadsheetId(data.source.config?.spreadsheet_id || "");
      setTab(data.source.config?.tab || "Sheet1");
      setMapping({
        phone: data.source.field_mapping?.phone || "",
        name: data.source.field_mapping?.name || "",
        email: data.source.field_mapping?.email || "",
      });
    }
  }

  async function createSource() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google_sheets",
          display_name: displayName,
          credentials_ref: credentialsRef,
          config: { spreadsheet_id: spreadsheetId, tab },
          field_mapping: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedSourceId(data.source.id);
      await runPreview(data.source.id);
      setStep("mapping");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runPreview(id: string) {
    const res = await fetch(`/api/lead-sources/${id}/preview`);
    const data = await res.json();
    if (res.ok) {
      setPreview(data);
      setMapping({
        phone: data.suggested?.phone || "",
        name: data.suggested?.name || "",
        email: data.suggested?.email || "",
      });
    }
  }

  async function saveMapping() {
    if (!savedSourceId) return;
    setLoading(true);
    try {
      await fetch(`/api/lead-sources/${savedSourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_mapping: mapping,
          config: { spreadsheet_id: spreadsheetId, tab },
        }),
      });
      const res = await fetch(`/api/lead-sources/${savedSourceId}/webhook-info`);
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo(data);
      }
      setStep("apps-script");
    } finally {
      setLoading(false);
    }
  }

  const appsScriptUrl = webhookInfo?.url || "";
  const appsScriptSecret = webhookInfo?.secret || "";

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link href="/integrations" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-6">
        <ArrowLeft className="w-4 h-4" /> Integrations
      </Link>

      <h1 className="text-2xl font-semibold text-white mb-2">Connect Google Sheets</h1>
      <p className="text-sm text-zinc-500 mb-8">
        The agent will call any new lead in your sheet and update each row with the outcome.
      </p>

      {step === "auth" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-zinc-300">
            Click below to sign in with Google. We only request read/write access to the sheets you choose.
          </div>
          <a
            href="/api/lead-sources/oauth/start?provider=google_sheets"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-zinc-200"
          >
            Connect Google account
          </a>
        </div>
      )}

      {step === "config" && (
        <div className="space-y-4 max-w-xl">
          <Field label="Name">
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Spreadsheet ID">
            <input
              className="input"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="from the sheet URL: /d/<SPREADSHEET_ID>/edit"
            />
          </Field>
          <Field label="Tab name">
            <input
              className="input"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
            />
          </Field>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button
            onClick={createSource}
            disabled={loading || !spreadsheetId}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue
          </button>
        </div>
      )}

      {step === "mapping" && preview && (
        <div className="space-y-5 max-w-xl">
          <div className="text-sm text-zinc-400">
            Detected columns: {preview.columns.filter(c => c !== "__lead_uid").join(", ")}
          </div>
          <MappingRow
            label="Phone column"
            value={mapping.phone}
            onChange={(v) => setMapping({ ...mapping, phone: v })}
            options={preview.columns}
          />
          <MappingRow
            label="Name column"
            value={mapping.name}
            onChange={(v) => setMapping({ ...mapping, name: v })}
            options={preview.columns}
          />
          <MappingRow
            label="Email column"
            value={mapping.email}
            onChange={(v) => setMapping({ ...mapping, email: v })}
            options={preview.columns}
          />
          <button
            onClick={saveMapping}
            disabled={loading || !mapping.phone}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-40"
          >
            Save mapping
          </button>
        </div>
      )}

      {step === "apps-script" && (
        <div className="space-y-5">
          <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" /> Mapping saved. Polling will pick up new leads within 5 minutes.
          </div>
          <div className="text-sm text-zinc-400">
            For near-instant dispatch, install this Apps Script in the sheet:
          </div>
          <ol className="text-sm text-zinc-300 space-y-2 list-decimal pl-5">
            <li>Open the sheet → Extensions → Apps Script.</li>
            <li>Paste the snippet below; replace URL and secret as shown.</li>
            <li>Save. Triggers → Add trigger → <code>installEdits</code> → On edit.</li>
          </ol>
          {webhookInfo && (
            <div className="space-y-2 text-xs">
              <CodeBox label="Webhook URL" value={appsScriptUrl} />
              <CodeBox label="Webhook secret" value={appsScriptSecret} />
              <a
                href={`/integrations/google_sheets/setup/apps-script.txt?id=${savedSourceId}`}
                className="inline-block mt-2 text-accent hover:underline"
              >
                Download ready-to-paste script →
              </a>
            </div>
          )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function MappingRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400 mb-1.5 block">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {options.filter((c) => c !== "__lead_uid").map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
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
