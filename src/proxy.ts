import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { validateToken } from "@/lib/auth";
import {
  checkRateLimit,
  checkLoginAttempts,
  isSuspiciousUserAgent,
  getClientIp,
  getGeoData,
  isCountryAllowed,
} from "@/lib/security";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");

  // Rate limit on all admin routes
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Login page: check if IP is blocked from too many failed attempts
  if (pathname === "/admin/login") {
    const loginCheck = checkLoginAttempts(ip);
    if (!loginCheck.allowed) {
      return NextResponse.json(
        { error: "Blocked. Try again later.", retryAfter: loginCheck.retryAfter },
        { status: 429 }
      );
    }

    // Block suspicious user agents on login
    if (isSuspiciousUserAgent(ua)) {
      event.waitUntil(logSecurityEvent(null, ip, "blocked_ua_login", ua));
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.next();
  }

  // All other admin routes: validate token
  const token = request.cookies.get("admin_token")?.value;
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = validateToken(token);
  if (!payload) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("admin_token");
    return response;
  }

  // Background: geo check + log access (non-blocking)
  event.waitUntil(
    (async () => {
      const geo = await getGeoData(ip);
      if (geo && !isCountryAllowed(geo.countryCode)) {
        // Country blocked but token was valid — suspicious
        await logSecurityEvent(payload.adminId, ip, "country_violation", ua, `${geo.countryCode} ${geo.city}`);
      }
      await logSecurityEvent(payload.adminId, ip, "access", ua, `${geo?.countryCode || "?"} ${geo?.city || "?"}`);
    })()
  );

  // Add admin info headers for downstream use
  const headers = new Headers(request.headers);
  headers.set("x-admin-id", payload.adminId);
  headers.set("x-admin-email", payload.email);
  headers.set("x-admin-role", payload.role);

  return NextResponse.next({ request: { headers } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logSecurityEvent(adminId: string | null, ip: string, action: string, ua: string | null, details?: string) {
  try {
    const { db } = await import("@/lib/db");
    await (db as any).adminLog.create({
      data: {
        adminId: adminId || undefined,
        action,
        ip,
        userAgent: ua || undefined,
        details: details || undefined,
      },
    });
  } catch {
    // Silently fail — don't break the request
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
