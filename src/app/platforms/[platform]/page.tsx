import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import GameGrid from "@/components/games/GameGrid";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PLATFORM_LABELS } from "@/lib/constants";

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;

  let games: any[] = [];
  try {
    games = await db.game.findMany({
      where: {
        platform,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        platform: true,
        coverImage: true,
        rating: true,
        fileSize: true,
        releaseYear: true,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    games = [];
  }

  if (games.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/platforms"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Platforms
        </Link>
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold mb-2">
            {PLATFORM_LABELS[platform] || platform.toUpperCase()}
          </h1>
          <p className="text-muted-foreground">No games found for this platform.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <Link
        href="/platforms"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Platforms
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {PLATFORM_LABELS[platform] || platform.toUpperCase()}
        </h1>
        <p className="text-muted-foreground">
          {games.length} {games.length === 1 ? "game" : "games"} available
        </p>
      </div>

      <GameGrid
        games={games.map((g) => ({
          ...g,
          coverImage: g.coverImage ?? undefined,
          fileSize: g.fileSize ?? undefined,
          releaseYear: g.releaseYear ?? undefined,
          rating: Number(g.rating),
        }))}
      />
    </div>
  );
}
