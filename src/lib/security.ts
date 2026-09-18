// Security utilities for admin panel protection
// Uses ip-api.com (45 req/min, no API key needed)

const ALLOWED_COUNTRY = "MX";
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

// Suspicious User-Agent patterns
const SUSPICIOUS_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /java\//i,
  /go-http-client/i,
  /scrapy/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
];

interface GeoData {
  country: string;
  countryCode: string;
  regionName: string;
  city: string;
  isp: string;
  proxy: boolean;
  hosting: boolean;
  status: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface LoginAttemptEntry {
  count: number;
  blockedUntil: number;
}

// In-memory stores (resets on server restart, acceptable for admin panel)
const rateLimitStore = new Map<string, RateLimitEntry>();
const loginAttemptStore = new Map<string, LoginAttemptEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
  for (const [key, entry] of loginAttemptStore.entries()) {
    if (now > entry.blockedUntil) loginAttemptStore.delete(key);
  }
}, 5 * 60 * 1000);

export async function getGeoData(ip: string): Promise<GeoData | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp,proxy,hosting`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === "success") return data;
    return null;
  } catch {
    return null;
  }
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function checkLoginAttempts(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttemptStore.get(ip);

  if (!entry) return { allowed: true };

  if (now < entry.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  loginAttemptStore.delete(ip);
  return { allowed: true };
}

export function recordFailedLogin(ip: string): { blocked: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttemptStore.get(ip);

  if (!entry || now > entry.blockedUntil) {
    loginAttemptStore.set(ip, { count: 1, blockedUntil: now + LOGIN_BLOCK_DURATION_MS });
    return { blocked: false };
  }

  entry.count++;

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.blockedUntil = now + LOGIN_BLOCK_DURATION_MS;
    return { blocked: true, retryAfter: LOGIN_BLOCK_DURATION_MS / 1000 };
  }

  return { blocked: false };
}

export function clearLoginAttempts(ip: string): void {
  loginAttemptStore.delete(ip);
}

export function isCountryAllowed(countryCode: string): boolean {
  return countryCode === ALLOWED_COUNTRY;
}

export function isSuspiciousUserAgent(ua: string | null): boolean {
  if (!ua) return true;
  return SUSPICIOUS_UA_PATTERNS.some((p) => p.test(ua));
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  geo?: GeoData;
  retryAfter?: number;
}

export async function performSecurityCheck(request: Request): Promise<SecurityCheckResult> {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");

  // 1. Rate limit
  if (!checkRateLimit(ip)) {
    return { allowed: false, reason: "rate_limit" };
  }

  // 2. Login attempts check
  const loginCheck = checkLoginAttempts(ip);
  if (!loginCheck.allowed) {
    return { allowed: false, reason: "login_blocked", retryAfter: loginCheck.retryAfter };
  }

  // 3. Suspicious User-Agent
  if (isSuspiciousUserAgent(ua)) {
    return { allowed: false, reason: "suspicious_ua" };
  }

  // 4. Geolocation check
  const geo = await getGeoData(ip);
  if (geo) {
    if (!isCountryAllowed(geo.countryCode)) {
      return { allowed: false, reason: "country_blocked", geo: geo || undefined };
    }
    if (geo.proxy || geo.hosting) {
      return { allowed: false, reason: "vpn_blocked", geo: geo || undefined };
    }
  }

  return { allowed: true, geo: geo || undefined };
}
