import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Don't protect the login page or auth API
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // API routes: Bearer token OR session cookie
  if (pathname.startsWith("/api/")) {
    const apiKey = process.env.SALES_ENGINE_API_KEY;
    const secret = process.env.LEADS_SECRET;

    // Try Bearer token (CLI / automation)
    if (apiKey) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === apiKey) {
        return NextResponse.next();
      }
    }

    // Try session cookie (dashboard)
    if (secret) {
      const cookie = req.cookies.get(COOKIE_NAME)?.value;
      if (cookie) {
        const valid = await verifySessionValue(cookie, secret);
        if (valid) return NextResponse.next();
      }
    }

    // If session auth isn't configured, allow browser requests through
    // (matches page route behavior — pages pass through when no PIN/secret set)
    if (!secret) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Page routes: PIN/session auth
  const pin = process.env.LEADS_PIN;
  const secret = process.env.LEADS_SECRET;

  if (!pin || !secret) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const valid = await verifySessionValue(cookie, secret);
    if (valid) {
      return NextResponse.next();
    }
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
