import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, COOKIE_NAME, MAX_AGE_SECONDS } from "@/lib/auth";

// In-memory rate limiter (resets on cold start, fine for personal use)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

const COOLDOWNS = [0, 5, 15, 30, 60, 120]; // seconds, indexed by attempt count

function getCooldownRemaining(ip: string): number {
  const record = failedAttempts.get(ip);
  if (!record || record.count === 0) return 0;

  const cooldownIndex = Math.min(record.count, COOLDOWNS.length - 1);
  const cooldownSeconds = COOLDOWNS[cooldownIndex];
  const elapsed = (Date.now() - record.lastAttempt) / 1000;
  const remaining = cooldownSeconds - elapsed;

  return remaining > 0 ? Math.ceil(remaining) : 0;
}

function recordFailure(ip: string) {
  const record = failedAttempts.get(ip);
  failedAttempts.set(ip, {
    count: (record?.count || 0) + 1,
    lastAttempt: Date.now(),
  });
}

function clearFailures(ip: string) {
  failedAttempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const pin = process.env.LEADS_PIN;
  const signingSecret = process.env.LEADS_SECRET;

  if (!pin || !signingSecret) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Check cooldown
  const cooldown = getCooldownRemaining(ip);
  if (cooldown > 0) {
    return NextResponse.json(
      { error: "Too many attempts", cooldown },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const attempt = body.pin;

  if (!attempt || typeof attempt !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  if (attempt !== pin) {
    recordFailure(ip);
    const nextCooldown = getCooldownRemaining(ip);
    return NextResponse.json(
      { error: "Incorrect", cooldown: nextCooldown },
      { status: 401 }
    );
  }

  // Success
  clearFailures(ip);
  const cookieValue = await createSessionValue(signingSecret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return response;
}
