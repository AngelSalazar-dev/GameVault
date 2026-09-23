import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const telegramFile = await db.telegramFile.findUnique({
      where: { id },
      include: { game: { select: { title: true, slug: true } } },
    });

    if (!telegramFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const downloadUrl = `https://t.me/${telegramFile.channel}/${telegramFile.messageId}`;

    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    console.error("Telegram download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}