import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, isSuspiciousUserAgent } from "@/lib/security";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const host = request.headers.get("host");
      if (!host) return false;
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}

function alreadyVoted(request: Request, id: string): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some((part) => part.trim() === `gv_v_${id}=1`);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ua = request.headers.get("user-agent");
    if (isSuspiciousUserAgent(ua)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
    }

    const ip = getClientIp(request);
    if (!checkRateLimit(`vote:${ip}`)) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const existing = await db.request.findUnique({
      where: { id },
      select: { id: true, votes: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.status === "rejected") {
      return NextResponse.json({ error: "Cannot vote on rejected requests" }, { status: 400 });
    }

    if (alreadyVoted(request, id)) {
      return NextResponse.json({ error: "Already voted", votes: existing.votes }, { status: 409 });
    }

    const updated = await db.request.update({
      where: { id },
      data: { votes: { increment: 1 } },
      select: { votes: true },
    });

    const response = NextResponse.json({ ok: true, votes: updated.votes });
    response.cookies.set(`gv_v_${id}`, "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
