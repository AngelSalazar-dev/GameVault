import { db } from "@/lib/db";
import {
  Gamepad2,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getGames() {
  try {
    const games = await db.game.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        platform: true,
        status: true,
        source: true,
        createdAt: true,
        _count: {
          select: {
            downloadLinks: true,
            ratings: true,
            comments: true,
          },
        },
      },
    });

    return games;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function AdminGamesPage() {
  const games = await getGames();

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
        <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Game
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
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
                <td className="px-4 py-3 uppercase">{game.platform}</td>
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
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      {game.status === "active" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
