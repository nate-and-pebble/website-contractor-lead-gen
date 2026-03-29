"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { extractCronConfigRaw } from "@/lib/cron-config";

interface DocMeta {
  key: string;
  updated_at: string;
  version: number;
  enabled: boolean;
}

export default function CronDocsAdmin() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [savedMarkdown, setSavedMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load document list
  useEffect(() => {
    fetch("/api/admin/cron-docs")
      .then((r) => r.json())
      .then((data) => {
        if (data.documents) setDocs(data.documents);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Load a specific document
  const loadDoc = useCallback(async (key: string) => {
    setSelectedKey(key);
    setError(null);
    setConfigError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/cron-docs/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setMarkdown(data.markdown ?? "");
      setSavedMarkdown(data.markdown ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  }, []);

  // Validate cron_config on change
  useEffect(() => {
    const raw = extractCronConfigRaw(markdown);
    if (!raw) {
      setConfigError("Missing ```cron_config``` block");
      return;
    }
    try {
      JSON.parse(raw);
      setConfigError(null);
    } catch {
      setConfigError("Invalid JSON in cron_config block");
    }
  }, [markdown]);

  // Save
  const save = async () => {
    if (!selectedKey) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/cron-docs/${encodeURIComponent(selectedKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSavedMarkdown(markdown);
      setSuccessMsg("Saved successfully");
      // Refresh list metadata
      setDocs((prev) =>
        prev.map((d) =>
          d.key === selectedKey
            ? { ...d, updated_at: new Date().toISOString(), version: (d.version ?? 0) + 1 }
            : d
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = markdown !== savedMarkdown;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">CRON Documents</h1>

      {/* Document list */}
      <div className="mb-6 flex flex-wrap gap-2">
        {docs.map((doc) => (
          <button
            key={doc.key}
            onClick={() => loadDoc(doc.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedKey === doc.key
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {doc.key}
            <span className="ml-2 text-xs opacity-60">v{doc.version}</span>
          </button>
        ))}
        {docs.length === 0 && (
          <p className="text-sm text-zinc-500">No documents found. Run the database migration first.</p>
        )}
      </div>

      {selectedKey && (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !!configError}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                saving || configError
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {isDirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
            {successMsg && <span className="text-xs text-green-600 font-medium">{successMsg}</span>}
          </div>

          {/* Errors */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {configError && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Config validation: {configError}
            </div>
          )}

          {/* Editor + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Markdown Editor</label>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full h-[600px] rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                spellCheck={false}
              />
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Preview</label>
              <div className="h-[600px] overflow-auto rounded-lg border border-zinc-300 bg-white px-6 py-4 prose prose-sm prose-zinc max-w-none">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
