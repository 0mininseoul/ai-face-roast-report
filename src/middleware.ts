import { NextRequest, NextResponse } from "next/server";

const MOBILE_RE = /Mobi|Android|iPhone|iPad/i;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ua = req.headers.get("user-agent") ?? "";
  const allow =
    path.startsWith("/mobile-only") ||
    path.startsWith("/terms") ||
    path.startsWith("/privacy") ||
    path.startsWith("/result") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/fonts") ||
    path.startsWith("/sfx") ||
    path === "/og-image.png" ||
    path === "/favicon.ico";

  if (MOBILE_RE.test(ua) && !allow) {
    return NextResponse.redirect(new URL("/mobile-only", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
