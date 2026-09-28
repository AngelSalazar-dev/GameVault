import Link from "next/link";
import { db } from "@/lib/db";
import { Gamepad2 } from "lucide-react";
import PlatformBadge from "@/components/games/PlatformBadge";
import { getPlatformKind } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function getPlatforms() {
  try {
    const platforms = await db.game.groupBy({
      by: ["platform"],
      where: { status: "active" },
      _count: { id: true },
      orderBy: { platform: "asc" },
    });

    return platforms.map((p) => ({
      platform: p.platform.toLowerCase(),
      count: p._count.id,
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function PlatformsPage() {
  const platforms = await getPlatforms();
  const pc = platforms.filter((p) => getPlatformKind(p.platform) === "pc");
  const roms = platforms.filter((p) => getPlatformKind(p.platform) === "rom");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Platforms</h1>
        <p className="text-muted-foreground">
          PC games and console ROMs, kept separate so you always know what
          you&apos;re downloading.
        </p>
      </div>

      {pc.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">PC Games</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pc.map((p) => (
              <Link
                key={p.platform}
                href={`/platforms/${p.platform}`}
                className="group rounded-lg border border-border bg-card p-4 text-center space-y-3 hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <div className="inline-flex rounded-full bg-accent/10 p-3 group-hover:bg-accent/20 transition-colors">
                  <Gamepad2 className="h-6 w-6 text-accent" />
                </div>
                <PlatformBadge platform={p.platform} variant="md" />
                <p className="text-sm text-muted-foreground">
                  {p.count.toLocaleString()}{" "}
                  {p.count === 1 ? "game" : "games"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {roms.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Console ROMs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {roms.map((p) => (
              <Link
                key={p.platform}
                href={`/platforms/${p.platform}`}
                className="group rounded-lg border border-border bg-card p-4 text-center space-y-3 hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <div className="inline-flex rounded-full bg-purple-500/10 p-3 group-hover:bg-purple-500/20 transition-colors">
                  <Gamepad2 className="h-6 w-6 text-purple-300" />
                </div>
                <PlatformBadge platform={p.platform} variant="md" />
                <p className="text-sm text-muted-foreground">
                  {p.count.toLocaleString()}{" "}
                  {p.count === 1 ? "game" : "games"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
