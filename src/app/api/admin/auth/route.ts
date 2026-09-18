import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { getClientIp, getGeoData, isCountryAllowed, recordFailedLogin, clearLoginAttempts } from "@/lib/security";

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  // Geo check before login
  const geo = await getGeoData(ip);
  if (geo && !isCountryAllowed(geo.countryCode)) {
    await logAuthEvent(null, ip, "blocked_country", ua, `${geo.countryCode}`);
    return NextResponse.json({ error: "Acceso no permitido desde tu ubicación" }, { status: 403 });
  }

  // Find admin by email
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    const result = recordFailedLogin(ip);
    await logAuthEvent(null, ip, "login_failed", ua, `email: ${email}`);
    return NextResponse.json(
      { error: "Credenciales inválidas", retryAfter: result.retryAfter },
      { status: 401 }
    );
  }

  // Verify password
  const hash = hashPassword(password, admin.passwordHash.split(":")[0]);
  if (hash !== admin.passwordHash.split(":")[1]) {
    const result = recordFailedLogin(ip);
    await logAuthEvent(admin.id, ip, "login_failed", ua, "wrong password");
    return NextResponse.json(
      { error: "Credenciales inválidas", retryAfter: result.retryAfter },
      { status: 401 }
    );
  }

  // Success
  clearLoginAttempts(ip);
  const token = generateToken(admin.id, admin.email, admin.role);

  await logAuthEvent(admin.id, ip, "login_success", ua, `${geo?.countryCode || "?"} ${geo?.city || "?"}`);

  const response = NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });

  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAuthEvent(adminId: string | null, ip: string, action: string, ua: string | null, details?: string) {
  try {
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
    // Silent fail
  }
}
