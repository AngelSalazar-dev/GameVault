"use client";

import { useState } from "react";
import {
  Gamepad2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import GameActions from "@/components/admin/GameActions";
import { PLATFORM_LABELS } from "@/lib/constants";

interface Game {
  id: string;
  title: string;
  slug: string;
  platform: string;
  status: string;
  source: string | null;
  createdAt: string;
  _count: {
    downloadLinks: number;
    ratings: number;
    comments: number;
  };
}

export default function AdminGamesClient({ games: initialGames }: { games: Game[] }) {
  const [games, setGames] = useState(initialGames);

  function handleStatusChange(gameId: string, newStatus: string) {
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, status: newStatus } : g));
  }

  function handleDelete(gameId: string) {
    setGames(prev => prev.filter(g => g.id !== gameId));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-accent" />
            Manage Games
          </h1>
          <p className="text-muted-foreground">{games.length} total games</p>
        </div>
        <Link
          href="/admin/games/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Game
        </Link>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Platform</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Links</th>
              <th className="px-4 py-3 text-left font-medium">Ratings</th>
              <th className="px-4 py-3 text-left font-medium">Comments</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="border-b border-border last:border-0 hover:bg-card/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/games/${game.slug}`}
                    className="font-medium hover:text-accent transition-colors"
                  >
                    {game.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{PLATFORM_LABELS[game.platform] || game.platform.toUpperCase()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      game.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : game.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {game.status}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">
                  {game.source || "N/A"}
                </td>
                <td className="px-4 py-3">{game._count.downloadLinks}</td>
                <td className="px-4 py-3">{game._count.ratings}</td>
                <td className="px-4 py-3">{game._count.comments}</td>
                <td className="px-4 py-3 text-right">
                  <GameActions
                    gameId={game.id}
                    gameSlug={game.slug}
                    currentStatus={game.status}
                    onStatusChange={(s) => handleStatusChange(game.id, s)}
                    onDelete={handleDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
