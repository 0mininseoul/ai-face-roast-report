import { NextRequest, NextResponse } from "next/server";
import { validateAdminBasicAuth } from "@/lib/admin/basicAuth";

const MOBILE_RE = /Mobi|Android|iPhone|iPad/i;
const PUBLIC_FILE_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|json|webmanifest|woff2?)$/i;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ua = req.headers.get("user-agent") ?? "";
  if (path.startsWith("/admindata")) {
    const auth = validateAdminBasicAuth(req.headers.get("authorization"));
    if (!auth.configured) return new NextResponse("Admin auth is not configured", { status: 503 });
    if (!auth.ok) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="faceroast-admin", charset="UTF-8"' },
      });
    }
    return NextResponse.next();
  }

  const allow =
    path.startsWith("/mobile-only") ||
    path.startsWith("/manual-analysis") ||
    path.startsWith("/terms") ||
    path.startsWith("/privacy") ||
    path.startsWith("/result") ||
    path.startsWith("/admindata") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/fonts") ||
    path.startsWith("/sfx") ||
    PUBLIC_FILE_RE.test(path);

  if (MOBILE_RE.test(ua) && !allow) {
    return NextResponse.redirect(new URL("/mobile-only", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
