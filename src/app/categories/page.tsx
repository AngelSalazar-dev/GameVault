import Link from "next/link";
import { Gamepad2, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

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

async function getCategoryPreviews() {
  try {
    const previews: Record<string, { id: string; title: string; slug: string; coverImage: string | null }[]> = {};
    await Promise.all(
      CATEGORIES.map(async (cat) => {
        const games = await db.game.findMany({
          where: { status: "active", genre: cat.slug, coverImage: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, title: true, slug: true, coverImage: true },
        });
        previews[cat.slug] = games;
      })
    );
    return previews;
  } catch {
    return {};
  }
}

export default async function CategoriesPage() {
  const [counts, previews] = await Promise.all([getCategoryCounts(), getCategoryPreviews()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Browse games by genre. {Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()} games available.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.slug] || 0;
          const preview = previews[cat.slug] || [];
          return (
            <Link
              key={cat.slug}
              href={`/games?genre=${cat.slug}`}
              className="group"
            >
              <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/10">
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
