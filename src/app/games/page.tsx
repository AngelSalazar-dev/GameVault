import { Suspense } from "react";
import { db } from "@/lib/db";
import GameGrid from "@/components/games/GameGrid";
import GameFilters from "@/components/games/GameFilters";

interface Game {
  id: string;
  title: string;
  slug: string;
  platform: string;
  coverImage?: string;
  rating: number;
  fileSize?: string;
  releaseYear?: number;
}

async function getGames(searchParams: {
  search?: string;
  platform?: string;
  genre?: string;
  sort?: string;
}) {
  const { search, platform, genre, sort } = searchParams;

  const where: Record<string, unknown> = {
    status: "active",
  };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (platform) {
    where.platform = platform;
  }

  if (genre) {
    where.genre = genre;
  }

  let orderBy: Record<string, string> = {};
  switch (sort) {
    case "oldest":
      orderBy = { releaseYear: "asc" };
      break;
    case "rating":
      orderBy = { rating: "desc" };
      break;
    case "title":
      orderBy = { title: "asc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const games = await db.game.findMany({
    where,
    orderBy,
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

  return games.map((g) => ({
    ...g,
    rating: Number(g.rating),
    coverImage: g.coverImage ?? undefined,
    fileSize: g.fileSize ?? undefined,
    releaseYear: g.releaseYear ?? undefined,
  })) as Game[];
}

async function getFilters() {
  const platforms = await db.game.findMany({
    where: { status: "active" },
    select: { platform: true },
    distinct: ["platform"],
    orderBy: { platform: "asc" },
  });

  const genres = await db.game.findMany({
    where: { status: "active" },
    select: { genre: true },
    distinct: ["genre"],
    orderBy: { genre: "asc" },
  });

  return {
    platforms: platforms.map((p) => p.platform).filter(Boolean) as string[],
    genres: genres.map((g) => g.genre).filter(Boolean) as string[],
  };
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [games, filters] = await Promise.all([
    getGames({
      search: params.search as string,
      platform: params.platform as string,
      genre: params.genre as string,
      sort: params.sort as string,
    }),
    getFilters(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Games</h1>
        <p className="text-muted-foreground">
          Browse our collection of {games.length} games across all platforms
        </p>
      </div>

      <Suspense fallback={<div>Loading filters...</div>}>
        <GameFilters platforms={filters.platforms} genres={filters.genres} />
      </Suspense>

      <GameGrid games={games} />
    </div>
  );
}
