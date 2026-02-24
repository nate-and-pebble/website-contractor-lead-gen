import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/api/handlers/auth";
import { COOKIE_NAME, MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const body = await req.json().catch(() => ({}));
  const result = await authenticate(ip, body.pin);

  const response = NextResponse.json(result.body, { status: result.status });

  if (result.sessionValue) {
    response.cookies.set(COOKIE_NAME, result.sessionValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  }

  return response;
}
