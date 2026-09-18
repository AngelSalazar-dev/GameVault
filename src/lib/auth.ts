import crypto from "crypto";

// Simple HMAC-based token (no external JWT library needed)
// Token format: base64url(payload).base64url(signature)
// Payload: { adminId, email, role, iat, exp }

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "gamevault-default-secret-change-in-production";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TokenPayload {
  adminId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

function base64url(data: Buffer | string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

function sign(payload: string): string {
  return base64url(
    crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest()
  );
}

export function generateToken(adminId: string, email: string, role: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    adminId,
    email,
    role,
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };

  const payloadStr = base64url(JSON.stringify(payload));
  const signature = sign(payloadStr);
  return `${payloadStr}.${signature}`;
}

export function validateToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadStr, receivedSig] = parts;
    const expectedSig = sign(payloadStr);

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64urlDecode(payloadStr).toString());

    // Check expiry
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
