import { createSessionValue } from "@/lib/auth";
import type { AuthResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// In-memory rate limiter (resets on cold start — fine for personal/small use)
// ---------------------------------------------------------------------------

const failedAttempts = new Map<
  string,
  { count: number; lastAttempt: number }
>();

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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export type { AuthResult } from "@/lib/types";

export async function authenticate(
  ip: string,
  pin: unknown
): Promise<AuthResult> {
  const expectedPin = process.env.LEADS_PIN;
  const signingSecret = process.env.LEADS_SECRET;

  if (!expectedPin || !signingSecret) {
    return { status: 500, body: { error: "Auth not configured" } };
  }

  // Rate-limit check
  const cooldown = getCooldownRemaining(ip);
  if (cooldown > 0) {
    return { status: 429, body: { error: "Too many attempts", cooldown } };
  }

  if (!pin || typeof pin !== "string") {
    return { status: 400, body: { error: "PIN required" } };
  }

  if (pin !== expectedPin) {
    recordFailure(ip);
    const nextCooldown = getCooldownRemaining(ip);
    return { status: 401, body: { error: "Incorrect", cooldown: nextCooldown } };
  }

  // Success
  clearFailures(ip);
  const sessionValue = await createSessionValue(signingSecret);
  return { status: 200, body: { ok: true }, sessionValue };
}
