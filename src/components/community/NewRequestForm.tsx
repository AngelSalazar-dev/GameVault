"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Send } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/constants";

export default function NewRequestForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    platform: "pc",
    description: "",
    authorName: "",
    website: "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const title = form.title.trim();
    if (title.length < 3 || title.length > 120) {
      setError("Title must be between 3 and 120 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          platform: form.platform,
          description: form.description.trim(),
          authorName: form.authorName.trim(),
          website: form.website,
        }),
      });

      if (res.ok) {
        setForm({ title: "", platform: "pc", description: "", authorName: "", website: "" });
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create request");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Request
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New game request"
            className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">New Request</h2>
                <p className="text-sm text-muted-foreground">
                  Request a game you want to see in the vault
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="space-y-2">
                <label htmlFor="req-title" className="text-sm font-medium">
                  Title *
                </label>
                <input
                  id="req-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="e.g. Silent Hill 2 Remake"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="req-platform" className="text-sm font-medium">
                  Platform *
                </label>
                <select
                  id="req-platform"
                  value={form.platform}
                  onChange={(e) => updateField("platform", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="req-description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="req-description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none resize-none"
                  placeholder="Why do you want this game? (optional)"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="req-name" className="text-sm font-medium">
                  Your name
                </label>
                <input
                  id="req-name"
                  type="text"
                  value={form.authorName}
                  onChange={(e) => updateField("authorName", e.target.value)}
                  maxLength={60}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="Anonymous (optional)"
                />
              </div>

              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="req-website">Website</label>
                <input
                  id="req-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
