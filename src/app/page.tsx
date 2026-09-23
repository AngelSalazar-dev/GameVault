import Link from "next/link";
import { Gamepad2, HardDrive, ArrowRight, Download, Star } from "lucide-react";
import { db } from "@/lib/db";
import { HOME_CATEGORIES } from "@/lib/constants";

async function getRecentGames() {
  try {
    const games = await db.game.findMany({
      where: { status: "active", coverImage: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        fileSize: true,
        releaseYear: true,
        genre: true,
      },
    });
    return games;
  } catch {
    return [];
  }
}

async function getGameCount() {
  try {
    return await db.game.count({ where: { status: "active" } });
  } catch {
    return 0;
  }
}

async function getCategoryGames(genre: string) {
  try {
    const games = await db.game.findMany({
      where: { status: "active", genre, coverImage: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        fileSize: true,
      },
    });
    return games;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [recentGames, totalGames] = await Promise.all([
    getRecentGames(),
    getGameCount(),
  ]);

  return (
    <div className="space-y-12 py-6">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          <Gamepad2 className="h-4 w-4" />
          {totalGames > 0 ? `${totalGames.toLocaleString()}+ Free Games` : "Free Games Library"}
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Welcome to{" "}
          <span className="text-accent">GameVault</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Your ultimate vault for free PC games and classic console ROMs.
          Browse, download, and preserve gaming history.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
          >
            Browse All Games
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/platforms"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-card transition-colors"
          >
            View Platforms
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
            <h2 className="text-lg font-semibold">PC Games</h2>
            <p className="text-sm text-muted-foreground">
              Pre-installed PC games ready to play. No installation needed,
              just download and run.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <Gamepad2 className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Console ROMs</h2>
            <p className="text-sm text-muted-foreground">
              Classic games from 34+ consoles. NES, SNES, PlayStation,
              Nintendo 64, and more.
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
            <h2 className="text-2xl font-bold">Recent Games</h2>
            <Link
              href="/games"
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
                    {game.coverImage ? (
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Gamepad2 className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
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
          <h2 className="text-2xl font-bold">Browse by Category</h2>
          <Link
            href="/categories"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            All categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/games?genre=${cat.slug}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-accent hover:bg-accent/5 transition-all"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-medium text-sm">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Previews */}
      {HOME_CATEGORIES.slice(0, 4).map(async (cat) => {
        const games = await getCategoryGames(cat.slug);
        if (games.length === 0) return null;
        return (
          <section key={cat.slug} className="mx-auto max-w-7xl px-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>{cat.icon}</span> {cat.name}
              </h3>
              <Link
                href={`/games?genre=${cat.slug}`}
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
                  <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-accent">
                    <div className="aspect-[3/4] overflow-hidden bg-muted">
                      {game.coverImage ? (
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Gamepad2 className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
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

      {/* Platforms */}
      <section className="mx-auto max-w-7xl px-4 space-y-6">
        <h2 className="text-2xl font-bold">Supported Platforms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {["PC", "PS1", "PS2", "PS3", "PS4", "PS5", "N64", "GameCube", "Wii", "Switch", "Genesis", "SNES", "NES", "GB", "GBA", "DS", "3DS", "Xbox", "Xbox 360", "Xbox One"].map((platform) => (
            <Link
              key={platform}
              href={`/platforms/${platform.toLowerCase().replace(/\s+/g, "")}`}
              className="rounded-lg border border-border bg-card p-3 text-center text-sm font-medium hover:border-accent hover:text-accent transition-colors"
            >
              {platform}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
