import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const game = await db.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, platform, genre, description, developer, publisher, releaseYear, fileSize, coverImage, status } = body;

    const updated = await db.game.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(platform && { platform }),
        ...(genre !== undefined && { genre: genre || null }),
        ...(description !== undefined && { description: description || null }),
        ...(developer !== undefined && { developer: developer || null }),
        ...(publisher !== undefined && { publisher: publisher || null }),
        ...(releaseYear !== undefined && { releaseYear: releaseYear ? parseInt(releaseYear) : null }),
        ...(fileSize !== undefined && { fileSize: fileSize || null }),
        ...(coverImage !== undefined && { coverImage: coverImage || null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ ok: true, game: updated });
  } catch (error) {
    console.error("Update game error:", error);
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}
