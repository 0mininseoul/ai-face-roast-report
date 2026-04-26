interface Bucket {
  minuteCount: number;
  minuteStart: number;
  hourCount: number;
  hourStart: number;
}

const buckets = new Map<string, Bucket>();
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const PER_MINUTE = 5;
const PER_HOUR = 30;

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current) {
    buckets.set(key, {
      minuteCount: 1,
      minuteStart: now,
      hourCount: 1,
      hourStart: now,
    });
    return { ok: true, retryAfterSec: 0 };
  }

  if (now - current.minuteStart > MINUTE_MS) {
    current.minuteStart = now;
    current.minuteCount = 0;
  }
  if (now - current.hourStart > HOUR_MS) {
    current.hourStart = now;
    current.hourCount = 0;
  }

  if (current.minuteCount >= PER_MINUTE) {
    return { ok: false, retryAfterSec: Math.ceil((MINUTE_MS - (now - current.minuteStart)) / 1000) };
  }
  if (current.hourCount >= PER_HOUR) {
    return { ok: false, retryAfterSec: Math.ceil((HOUR_MS - (now - current.hourStart)) / 1000) };
  }

  current.minuteCount += 1;
  current.hourCount += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function ipFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function ipHash(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? "";
  const bytes = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}
