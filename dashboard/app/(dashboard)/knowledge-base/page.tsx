"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Upload, FileText, Trash2, Loader2 } from "lucide-react";

interface KBFile {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  embedding_status?: string;
}

export default function KnowledgeBasePage() {
  const [files, setFiles] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      // Supabase not connected
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);

    for (const file of Array.from(selected)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/knowledge", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.file) {
          setFiles((prev) => [data.file, ...prev]);
        }
      } catch {
        // Skip failed uploads silently
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Knowledge Base</h1>
        <p className="text-sm text-muted mt-1">
          Upload documents for your agent to reference during calls
        </p>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className="bg-card border-2 border-dashed border-card-border rounded-sm p-10 text-center cursor-pointer hover:border-accent/50 transition-colors group"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-accent mx-auto mb-3 animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-stone-600 group-hover:text-accent mx-auto mb-3 transition-colors" />
        )}
        <p className="text-sm text-stone-400">
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </p>
        <p className="text-xs text-stone-600 mt-1">
          TXT, MD, PDF — max 10MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx,.doc"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {files.length > 0 ? (
        <div className="bg-card border border-card-border rounded-sm overflow-hidden">
          <div className="border-b border-card-border px-5 py-3">
            <div className="grid grid-cols-5 gap-4 text-xs font-medium text-muted uppercase tracking-wider">
              <span className="col-span-2">File</span>
              <span>Size</span>
              <span>Embeddings</span>
              <span className="text-right">Actions</span>
            </div>
          </div>
          <div className="divide-y divide-card-border">
            {files.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center"
              >
                <div className="flex items-center gap-2.5 col-span-2">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm text-stone-300 truncate">
                    {f.file_name}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {f.file_size < 1024
                    ? `${f.file_size} B`
                    : f.file_size < 1048576
                      ? `${(f.file_size / 1024).toFixed(1)} KB`
                      : `${(f.file_size / 1048576).toFixed(1)} MB`}
                </span>
                <span>
                  <EmbeddingBadge status={f.embedding_status} />
                </span>
                <div className="text-right">
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-sm p-10 text-center">
          <BookOpen className="w-8 h-8 text-stone-700 mx-auto mb-3" />
          <p className="text-sm text-muted">No files uploaded</p>
          <p className="text-xs text-stone-600 mt-1">
            Upload documents to give your agent business context. When Pinecone
            is configured, documents are chunked and embedded for semantic
            search during calls.
          </p>
        </div>
      )}
    </div>
  );
}

function EmbeddingBadge({ status }: { status?: string }) {
  const s = status || "pending";
  const styles: Record<string, string> = {
    completed: "bg-green-500/10 text-green-400",
    processing: "bg-yellow-500/10 text-yellow-400",
    failed: "bg-red-500/10 text-red-400",
    pending: "bg-zinc-500/10 text-stone-500",
  };
  const labels: Record<string, string> = {
    completed: "Indexed",
    processing: "Processing",
    failed: "Failed",
    pending: "Pending",
  };
  return (
    <span
      className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${styles[s] || styles.pending}`}
    >
      {labels[s] || s}
    </span>
  );
}
