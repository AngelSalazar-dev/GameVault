import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import EditGameForm from "@/components/admin/EditGameForm";

export const dynamic = "force-dynamic";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const game = await db.game.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        platform: true,
        genre: true,
        description: true,
        developer: true,
        publisher: true,
        releaseYear: true,
        fileSize: true,
        coverImage: true,
        status: true,
      },
    });

    if (!game) notFound();

    return <EditGameForm game={game} />;
  } catch (error) {
    console.error("Database error:", error);
    notFound();
  }
}
