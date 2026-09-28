import Link from "next/link";
import { Gamepad2, HardDrive, ArrowRight, Download, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import {
  HOME_CATEGORIES,
  HOME_PLATFORM,
  HOME_PLATFORM_CHIPS,
  getPlatformKind,
} from "@/lib/constants";
import CoverImage from "@/components/games/CoverImage";
import PlatformBadge from "@/components/games/PlatformBadge";

const gameSelect = {
  id: true,
  title: true,
  slug: true,
  platform: true,
  coverImage: true,
  fileSize: true,
  releaseYear: true,
  genre: true,
} as const;

async function getRecentGames() {
  try {
    return await db.game.findMany({
      where: { status: "active", platform: HOME_PLATFORM, coverImage: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: gameSelect,
    });
  } catch {
    return [];
  }
}

async function getGameCount() {
  try {
    return await db.game.count({ where: { status: "active", platform: HOME_PLATFORM } });
  } catch {
    return 0;
  }
}

async function getCategoryGames(genre: string) {
  try {
    return await db.game.findMany({
      where: {
        status: "active",
        platform: HOME_PLATFORM,
        genre,
        coverImage: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: gameSelect,
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  const [recentGames, totalGames, categoryRows] = await Promise.all([
    getRecentGames(),
    getGameCount(),
    Promise.all(
      HOME_CATEGORIES.slice(0, 4).map(async (cat) => ({
        category: cat,
        games: await getCategoryGames(cat.slug),
      }))
    ),
  ]);

  const genreHref = (slug: string) =>
    `/games?genre=${slug}&platform=${HOME_PLATFORM}`;

  return (
    <div className="space-y-12 py-6">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          <Gamepad2 className="h-4 w-4" />
          {totalGames > 0 ? `${totalGames.toLocaleString()}+ Free PC Games` : "Free PC Games Library"}
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Welcome to{" "}
          <span className="text-accent">GameVault</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Thousands of free PC games, pre-installed and ready to play.
          Download, extract, run. No installers, no waiting.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/games?platform=${HOME_PLATFORM}`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
          >
            Browse PC Games
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/platforms"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-card transition-colors"
          >
            Console ROMs
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <HardDrive className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Pre-installed PC Games</h2>
            <p className="text-sm text-muted-foreground">
              Every game is already set up and ready to run. No installation
              needed, just download and play.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Curated by Genre</h2>
            <p className="text-sm text-muted-foreground">
              Action, RPG, strategy, indie and more. Browse the PC library
              organized by genre and year.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <Download className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Direct Downloads</h2>
            <p className="text-sm text-muted-foreground">
              Instant download links with no ads, no surveys, no waiting.
              Just click and download.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Latest PC Games</h2>
            <Link
              href={`/games?platform=${HOME_PLATFORM}`}
              className="text-sm text-accent hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="group"
              >
                <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/10">
                  <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                    <CoverImage
                      src={game.coverImage}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      iconClassName="h-8 w-8"
                    />
                    <div className="absolute top-2 right-2">
                      <PlatformBadge platform={game.platform} />
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <h3 className="font-medium text-xs line-clamp-2 group-hover:text-accent transition-colors">
                      {game.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      {game.releaseYear && <span>{game.releaseYear}</span>}
                      {game.fileSize && (
                        <span className="flex items-center gap-0.5">
                          <Download className="h-2.5 w-2.5" />
                          {game.fileSize}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Browse PC by Category</h2>
          <Link
            href={`/games?platform=${HOME_PLATFORM}`}
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            All PC games <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={genreHref(cat.slug)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-accent hover:bg-accent/5 transition-all"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-medium text-sm">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Previews */}
      {categoryRows.map(({ category, games }) => {
        if (games.length === 0) return null;
        return (
          <section key={category.slug} className="mx-auto max-w-7xl px-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>{category.icon}</span> {category.name}
              </h3>
              <Link
                href={genreHref(category.slug)}
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                More <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {games.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.slug}`}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-all group-hover:border-accent">
                    <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                      <CoverImage
                        src={game.coverImage}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        iconClassName="h-6 w-6"
                      />
                      <div className="absolute top-1.5 right-1.5">
                        <PlatformBadge platform={game.platform} />
                      </div>
                    </div>
                    <div className="p-2">
                      <h4 className="text-xs font-medium line-clamp-2 group-hover:text-accent">
                        {game.title}
                      </h4>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Supported Platforms */}
      <section className="mx-auto max-w-7xl px-4 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Supported Platforms</h2>
          <p className="text-sm text-muted-foreground">
            PC platforms in green. The rest are console ROMs.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {HOME_PLATFORM_CHIPS.map((chip) => (
            <Link
              key={chip.slug}
              href={`/platforms/${chip.slug}`}
              className={
                getPlatformKind(chip.slug) === "pc"
                  ? "rounded-lg border border-accent/40 bg-accent/10 p-3 text-center text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
                  : "rounded-lg border border-border bg-card p-3 text-center text-sm font-medium hover:border-accent hover:text-accent transition-colors"
              }
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
