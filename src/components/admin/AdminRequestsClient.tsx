"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export interface AdminRequestItem {
  id: string;
  title: string;
  platform: string | null;
  description: string | null;
  authorName: string | null;
  status: string;
  votes: number;
  createdAt: string;
}

interface AdminRequestsClientProps {
  requests: AdminRequestItem[];
}

const STATUSES = ["pending", "fulfilled", "rejected"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  fulfilled: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function AdminRequestsClient({ requests }: AdminRequestsClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update status");
        return;
      }
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this request permanently?")) return;
    setLoadingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete request");
        return;
      }
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {requests.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card text-muted-foreground">
          No requests found
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 lg:flex-row lg:items-start"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{request.title}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[request.status] || ""}`}>
                    {request.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{request.votes} votes</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {request.platform && <span className="border border-border rounded px-1.5 py-0.5">{request.platform}</span>}
                  {request.authorName && <span>by {request.authorName}</span>}
                  <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
                {request.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{request.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor={`status-${request.id}`} className="sr-only">
                  Status for {request.title}
                </label>
                <select
                  id={`status-${request.id}`}
                  value={request.status}
                  disabled={loadingId === request.id}
                  onChange={(e) => updateStatus(request.id, e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(request.id)}
                  disabled={loadingId === request.id}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label={`Delete ${request.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
