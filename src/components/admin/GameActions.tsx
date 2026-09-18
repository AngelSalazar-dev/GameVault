"use client";

import { useState } from "react";
import { Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface GameActionsProps {
  gameId: string;
  gameSlug: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  onDelete: (gameId: string) => void;
}

export default function GameActions({ gameId, gameSlug, currentStatus, onStatusChange, onDelete }: GameActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onStatusChange(data.status);
      }
    } catch (error) {
      console.error("Toggle error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este juego permanentemente?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(gameId);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/games/${gameId}/edit`}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Edit className="h-4 w-4" />
      </Link>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {currentStatus === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
