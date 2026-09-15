import Link from "next/link";
import { db } from "@/lib/db";
import { Gamepad2 } from "lucide-react";

const platformLabels: Record<string, string> = {
  pc: "PC",
  ps1: "PlayStation 1",
  ps2: "PlayStation 2",
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  n64: "Nintendo 64",
  gamecube: "GameCube",
  wii: "Wii",
  wiiu: "Wii U",
  switch: "Nintendo Switch",
  genesis: "Sega Genesis",
  snes: "Super Nintendo",
  nes: "Nintendo",
  gb: "Game Boy",
  gba: "Game Boy Advance",
  ds: "Nintendo DS",
  "3ds": "Nintendo 3DS",
  xbox: "Xbox",
  xbox360: "Xbox 360",
  xboxone: "Xbox One",
  xboxseries: "Xbox Series",
};

async function getPlatforms() {
  try {
    const platforms = await db.game.groupBy({
      by: ["platform"],
      where: { status: "active" },
      _count: { id: true },
      orderBy: { platform: "asc" },
    });

    return platforms.map((p) => ({
      platform: p.platform,
      count: p._count.id,
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function PlatformsPage() {
  const platforms = await getPlatforms();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Platforms</h1>
        <p className="text-muted-foreground">
          Browse games by platform
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {platforms.map((p) => (
          <Link
            key={p.platform}
            href={`/platforms/${p.platform}`}
            className="group rounded-lg border border-border bg-card p-4 text-center space-y-3 hover:border-accent hover:bg-accent/5 transition-colors"
          >
            <div className="inline-flex rounded-full bg-accent/10 p-3 group-hover:bg-accent/20 transition-colors">
              <Gamepad2 className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">
                {platformLabels[p.platform] || p.platform.toUpperCase()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {p.count} {p.count === 1 ? "game" : "games"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
