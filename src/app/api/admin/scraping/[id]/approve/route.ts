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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await db.scrapingQueue.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const data = item.suggestedData as Record<string, unknown> | null;

    if (data?.title && data?.platform) {
      let slug = slugify(data.title as string);
      const existing = await db.game.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now()}`;

      await db.game.create({
        data: {
          title: data.title as string,
          slug,
          platform: data.platform as string,
          genre: (data.genre as string) || null,
          description: (data.description as string) || null,
          developer: (data.developer as string) || null,
          publisher: (data.publisher as string) || null,
          releaseYear: data.releaseYear ? Number(data.releaseYear) : null,
          fileSize: (data.fileSize as string) || null,
          coverImage: (data.coverImage as string) || null,
          status: "active",
          source: item.source,
        },
      });
    }

    await db.scrapingQueue.update({
      where: { id },
      data: { status: "approved", processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Approve scraping error:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
