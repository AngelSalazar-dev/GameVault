import { db } from "@/lib/db";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getManuals() {
  try {
    const manuals = await db.manual.findMany({
      include: {
        game: {
          select: {
            title: true,
            slug: true,
            platform: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return manuals;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function ManualsPage() {
  const manuals = await getManuals();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-accent" />
          Manual Project
        </h1>
        <p className="text-muted-foreground">
          Full-color manual scans for thousands of games
        </p>
      </div>

      {manuals.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No manuals yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to contribute a manual scan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {manuals.map((manual) => (
            <a
              key={manual.id}
              href={manual.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-border bg-card p-4 space-y-3 hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <div className="inline-flex rounded-lg bg-accent/10 p-3 group-hover:bg-accent/20 transition-colors">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-accent transition-colors">
                  {manual.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {manual.game.title}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {manual.pageCount && <span>{manual.pageCount} pages</span>}
                  {manual.language && <span>• {manual.language}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
