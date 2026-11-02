import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const game = await db.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const newStatus = game.status === "active" ? "pending" : "active";
    await db.game.update({ where: { id }, data: { status: newStatus } });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error("Toggle game error:", error);
    return NextResponse.json({ error: "Failed to toggle game" }, { status: 500 });
  }
}
