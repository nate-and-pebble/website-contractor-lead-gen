const COOKIE_NAME = "leads_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionValue(secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await hmacSign(timestamp, secret);
  return `${timestamp}.${signature}`;
}

export async function verifySessionValue(
  cookie: string,
  secret: string
): Promise<boolean> {
  const dot = cookie.indexOf(".");
  if (dot === -1) return false;

  const timestamp = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  const ts = parseInt(timestamp);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - ts > MAX_AGE_SECONDS) return false;

  const expected = await hmacSign(timestamp, secret);
  return expected === signature;
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
