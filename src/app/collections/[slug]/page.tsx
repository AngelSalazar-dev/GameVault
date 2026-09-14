import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import GameGrid from "@/components/games/GameGrid";
import { ArrowLeft, Folder } from "lucide-react";
import Link from "next/link";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const collection = await db.collection.findUnique({
    where: { slug },
    include: {
      games: {
        include: {
          game: {
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
          },
        },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  const games = collection.games.map((gc) => ({
    ...gc.game,
    coverImage: gc.game.coverImage ?? undefined,
    fileSize: gc.game.fileSize ?? undefined,
    releaseYear: gc.game.releaseYear ?? undefined,
    rating: Number(gc.game.rating),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <Link
        href="/collections"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Collections
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-accent/10 p-2">
            <Folder className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">{collection.name}</h1>
        </div>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {games.length} {games.length === 1 ? "game" : "games"}
        </p>
      </div>

      <GameGrid games={games} />
    </div>
  );
}
