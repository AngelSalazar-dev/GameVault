import { db } from "@/lib/db";
import AdminGamesClient from "@/components/admin/AdminGamesClient";

export const dynamic = "force-dynamic";

async function getGames() {
  try {
    const games = await db.game.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        platform: true,
        status: true,
        source: true,
        createdAt: true,
        _count: {
          select: {
            downloadLinks: true,
            ratings: true,
            comments: true,
          },
        },
      },
    });

    return games.map(g => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function AdminGamesPage() {
  const games = await getGames();
  return <AdminGamesClient games={games} />;
}
