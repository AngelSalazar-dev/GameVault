import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, platform, genre, description, developer, publisher, releaseYear, fileSize, coverImage, status } = body;

    if (!title || !platform) {
      return NextResponse.json({ error: "Title and platform are required" }, { status: 400 });
    }

    let slug = slugify(title);
    const existing = await db.game.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const game = await db.game.create({
      data: {
        title,
        slug,
        platform,
        genre: genre || null,
        description: description || null,
        developer: developer || null,
        publisher: publisher || null,
        releaseYear: releaseYear ? parseInt(releaseYear) : null,
        fileSize: fileSize || null,
        coverImage: coverImage || null,
        status: status || "pending",
        source: "manual",
      },
    });

    return NextResponse.json({ ok: true, game });
  } catch (error) {
    console.error("Create game error:", error);
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}
