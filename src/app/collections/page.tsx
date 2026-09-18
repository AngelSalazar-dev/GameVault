import Link from "next/link";
import { db } from "@/lib/db";
import { Folder } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCollections() {
  try {
    const collections = await db.collection.findMany({
      include: {
        _count: {
          select: { games: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return collections.map((c) => ({
      ...c,
      gameCount: c._count.games,
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground">
          Browse game series and franchises
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <p className="text-muted-foreground">No collections yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="group rounded-lg border border-border bg-card p-4 space-y-3 hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <div className="inline-flex rounded-lg bg-accent/10 p-3 group-hover:bg-accent/20 transition-colors">
                <Folder className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-accent transition-colors">
                  {c.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {c.gameCount} {c.gameCount === 1 ? "game" : "games"}
                </p>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {c.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
