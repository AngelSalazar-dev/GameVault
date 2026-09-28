import { db } from "@/lib/db";
import GameGrid from "@/components/games/GameGrid";
import PlatformBadge from "@/components/games/PlatformBadge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getPlatformLabel } from "@/lib/constants";

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;

type PlatformGame = {
  id: string;
  title: string;
  slug: string;
  platform: string;
  coverImage: string | null;
  rating: unknown;
  fileSize: string | null;
  releaseYear: number | null;
};

  let games: PlatformGame[] = [];
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
        <div className="text-center py-16 space-y-3">
          <PlatformBadge platform={platform} variant="md" />
          <h1 className="text-3xl font-bold">{getPlatformLabel(platform)}</h1>
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
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{getPlatformLabel(platform)}</h1>
          <PlatformBadge platform={platform} variant="md" />
        </div>
        <p className="text-muted-foreground">
          {games.length.toLocaleString()} {games.length === 1 ? "game" : "games"} available
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
