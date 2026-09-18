"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface ScrapingActionsProps {
  itemId: string;
  onStatusChange: (newStatus: string) => void;
}

export default function ScrapingActions({ itemId, onStatusChange }: ScrapingActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scraping/${itemId}/approve`, { method: "POST" });
      if (res.ok) {
        onStatusChange("approved");
      }
    } catch (error) {
      console.error("Approve error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scraping/${itemId}/reject`, { method: "POST" });
      if (res.ok) {
        onStatusChange("rejected");
      }
    } catch (error) {
      console.error("Reject error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        Reject
      </button>
    </div>
  );
}
