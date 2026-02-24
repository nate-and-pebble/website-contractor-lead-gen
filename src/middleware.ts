import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pin = process.env.LEADS_PIN;
  const secret = process.env.LEADS_SECRET;

  // If PIN auth isn't configured, allow everything through
  if (!pin || !secret) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Don't protect the login page or auth API
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Don't protect API routes — for future API auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for valid session cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const valid = await verifySessionValue(cookie, secret);
    if (valid) {
      return NextResponse.next();
    }
  }

  // No valid session — redirect to login
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
