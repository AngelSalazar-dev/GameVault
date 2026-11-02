import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    await db.scrapingQueue.update({
      where: { id },
      data: { status: "rejected", processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reject scraping error:", error);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
