import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PLATFORM_LABELS } from "@/lib/constants";
import { checkRateLimit, getClientIp, isSuspiciousUserAgent } from "@/lib/security";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

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

export async function POST(request: Request) {
  try {
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
    if (!checkRateLimit(`requests:${ip}`)) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const raw = body as Record<string, unknown>;

    // Honeypot: bots fill hidden fields
    const honeypot = typeof raw.website === "string" ? raw.website.trim() : "";
    if (honeypot) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const title = typeof raw.title === "string" ? stripHtml(raw.title) : "";
    const platform = typeof raw.platform === "string" ? raw.platform.trim() : "";
    const description = typeof raw.description === "string" ? stripHtml(raw.description).slice(0, 2000) : "";
    const authorName = typeof raw.authorName === "string" ? stripHtml(raw.authorName).slice(0, 60) : "";

    if (title.length < 3 || title.length > 120) {
      return NextResponse.json({ error: "Title must be between 3 and 120 characters" }, { status: 400 });
    }

    if (!platform || !(platform in PLATFORM_LABELS)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const existing = await db.request.findFirst({
      where: {
        title,
        platform,
        status: { not: "rejected" },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "A similar request already exists" }, { status: 409 });
    }

    const created = await db.request.create({
      data: {
        title,
        platform,
        description: description || null,
        authorName: authorName || null,
        status: "pending",
        votes: 0,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
