import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";

const CATEGORIES = [
  { slug: "action", name: "Action", icon: "💥", color: "from-red-500/20 to-orange-500/20" },
  { slug: "adventure", name: "Adventure", icon: "🗺️", color: "from-blue-500/20 to-cyan-500/20" },
  { slug: "anime", name: "Anime", icon: "🎌", color: "from-pink-500/20 to-purple-500/20" },
  { slug: "building", name: "Building", icon: "🏗️", color: "from-yellow-500/20 to-amber-500/20" },
  { slug: "horror", name: "Horror", icon: "👻", color: "from-gray-500/20 to-red-500/20" },
  { slug: "indie", name: "Indie", icon: "🎮", color: "from-green-500/20 to-emerald-500/20" },
  { slug: "multiplayer", name: "Multiplayer", icon: "👥", color: "from-blue-500/20 to-indigo-500/20" },
  { slug: "open-world", name: "Open World", icon: "🌍", color: "from-teal-500/20 to-green-500/20" },
  { slug: "racing", name: "Racing", icon: "🏎️", color: "from-orange-500/20 to-red-500/20" },
  { slug: "role-playing-game", name: "RPG", icon: "⚔️", color: "from-purple-500/20 to-pink-500/20" },
  { slug: "simulation", name: "Simulation", icon: "🎯", color: "from-indigo-500/20 to-blue-500/20" },
  { slug: "sports", name: "Sports", icon: "⚽", color: "from-green-500/20 to-lime-500/20" },
  { slug: "strategy", name: "Strategy", icon: "🧠", color: "from-amber-500/20 to-yellow-500/20" },
  { slug: "survival", name: "Survival", icon: "🏕️", color: "from-emerald-500/20 to-teal-500/20" },
  { slug: "virtual-reality", name: "VR", icon: "🥽", color: "from-violet-500/20 to-purple-500/20" },
  { slug: "first-person-shooter", name: "FPS", icon: "🔫", color: "from-red-500/20 to-pink-500/20" },
];

async function getCategoryCounts() {
  try {
    const counts = await db.game.groupBy({
      by: ["genre"],
      where: { status: "active" },
      _count: { id: true },
    });
    const map: Record<string, number> = {};
    for (const c of counts) {
      if (c.genre) map[c.genre] = c._count.id;
    }
    return map;
  } catch {
    return {};
  }
}

async function getCategoryPreview(genre: string) {
  try {
    const games = await db.game.findMany({
      where: { status: "active", genre, coverImage: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
      },
    });
    return games;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const [counts] = await Promise.all([getCategoryCounts()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Browse games by genre. {Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()} games available.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map(async (cat) => {
          const count = counts[cat.slug] || 0;
          const preview = await getCategoryPreview(cat.slug);
          return (
            <Link
              key={cat.slug}
              href={`/games?genre=${cat.slug}`}
              className="group"
            >
              <div className={`rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/10`}>
                {/* Preview grid */}
                <div className={`grid grid-cols-2 gap-0.5 bg-gradient-to-br ${cat.color} p-0.5`}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square bg-muted/50 overflow-hidden">
                      {preview[i]?.coverImage ? (
                        <img
                          src={preview[i].coverImage}
                          alt=""
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Gamepad2 className="h-4 w-4 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-semibold group-hover:text-accent transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {count.toLocaleString()} games
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
