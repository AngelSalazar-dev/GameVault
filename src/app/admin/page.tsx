import { db } from "@/lib/db";
import {
  Settings,
  Database,
  Gamepad2,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [games, requests, pendingScraping] =
      await Promise.all([
        db.game.count({ where: { status: "active" } }),
        db.request.count(),
        db.scrapingQueue.count({ where: { status: "pending" } }),
      ]);

    return { games, requests, pendingScraping };
  } catch (error) {
    console.error("Database error:", error);
    return { games: 0, requests: 0, pendingScraping: 0 };
  }
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-accent" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage your GameVault</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Gamepad2 className="h-5 w-5 text-muted-foreground" />
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-bold">{stats.games}</div>
          <div className="text-sm text-muted-foreground">Active Games</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.requests}</div>
          <div className="text-sm text-muted-foreground">Requests</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.pendingScraping}</div>
          <div className="text-sm text-muted-foreground">Pending Scraping</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/admin/games"
              className="block rounded-lg border border-border p-3 hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <div className="font-medium">Manage Games</div>
              <div className="text-sm text-muted-foreground">
                Add, edit, or remove games
              </div>
            </Link>
            <Link
              href="/admin/scraping"
              className="block rounded-lg border border-border p-3 hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <div className="font-medium">Scraping Queue</div>
              <div className="text-sm text-muted-foreground">
                Review and approve scraped games
              </div>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">System Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span>TiDB Serverless</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework</span>
              <span>Next.js 16</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hosting</span>
              <span>Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
