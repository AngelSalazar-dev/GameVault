import { Suspense } from "react";
import { db } from "@/lib/db";
import GameGrid from "@/components/games/GameGrid";
import GameFilters from "@/components/games/GameFilters";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

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

const PAGE_SIZE = 48;

async function getGames(searchParams: {
  search?: string;
  platform?: string;
  genre?: string;
  sort?: string;
  page?: number;
}) {
  try {
    const { search, platform, genre, sort } = searchParams;
    const page = searchParams.page ?? 1;

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

    const [games, total] = await Promise.all([
      db.game.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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
      }),
      db.game.count({ where }),
    ]);

    return {
      games: games.map((g) => ({
        ...g,
        rating: Number(g.rating),
        coverImage: g.coverImage ?? undefined,
        fileSize: g.fileSize ?? undefined,
        releaseYear: g.releaseYear ?? undefined,
      })) as Game[],
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  } catch (error) {
    console.error("Database error:", error);
    return { games: [], total: 0, totalPages: 0 };
  }
}

async function getFilters() {
  try {
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
  } catch (error) {
    console.error("Database error:", error);
    return { platforms: [], genres: [] };
  }
}

function buildPageUrl(params: Record<string, string | undefined>, page: number): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  sp.set("page", String(page));
  return `/games?${sp.toString()}`;
}

function getPageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("gap");

  items.push(total);
  return items;
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page as string) || 1);

  const [result, filters] = await Promise.all([
    getGames({
      search: params.search as string,
      platform: params.platform as string,
      genre: params.genre as string,
      sort: params.sort as string,
      page,
    }),
    getFilters(),
  ]);

  const { games, total, totalPages } = result;
  const filterParams = {
    search: params.search as string | undefined,
    platform: params.platform as string | undefined,
    genre: params.genre as string | undefined,
    sort: params.sort as string | undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Games</h1>
        <p className="text-muted-foreground">
          Browse our collection of {total.toLocaleString()} games across all platforms
        </p>
      </div>

      <Suspense fallback={<div>Loading filters...</div>}>
        <GameFilters platforms={filters.platforms} genres={filters.genres} />
      </Suspense>

      <GameGrid games={games} />

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-center gap-1.5 pt-4"
        >
          <Link
            href={buildPageUrl(filterParams, 1)}
            aria-disabled={page === 1}
            className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              page === 1
                ? "pointer-events-none border-border/50 text-muted-foreground/40"
                : "border-border hover:border-accent hover:text-accent"
            }`}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline">First</span>
          </Link>
          <Link
            href={buildPageUrl(filterParams, Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              page === 1
                ? "pointer-events-none border-border/50 text-muted-foreground/40"
                : "border-border hover:border-accent hover:text-accent"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Link>

          <div className="flex items-center gap-1.5 mx-1">
            {getPageItems(page, totalPages).map((item, i) =>
              item === "gap" ? (
                <span
                  key={`gap-${i}`}
                  className="px-1.5 text-sm text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageUrl(filterParams, item)}
                  aria-current={item === page ? "page" : undefined}
                  className={`min-w-[2.25rem] rounded-lg border px-2 py-2 text-center text-sm transition-colors ${
                    item === page
                      ? "border-accent bg-accent/10 font-semibold text-accent"
                      : "border-border hover:border-accent hover:text-accent"
                  }`}
                >
                  {item}
                </Link>
              )
            )}
          </div>

          <Link
            href={buildPageUrl(filterParams, Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              page === totalPages
                ? "pointer-events-none border-border/50 text-muted-foreground/40"
                : "border-border hover:border-accent hover:text-accent"
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={buildPageUrl(filterParams, totalPages)}
            aria-disabled={page === totalPages}
            className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              page === totalPages
                ? "pointer-events-none border-border/50 text-muted-foreground/40"
                : "border-border hover:border-accent hover:text-accent"
            }`}
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="h-4 w-4" />
          </Link>

          <span className="w-full sm:w-auto sm:ml-3 text-center text-sm text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()}
          </span>
        </nav>
      )}
    </div>
  );
}
