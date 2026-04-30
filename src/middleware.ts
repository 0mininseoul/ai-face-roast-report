import { NextRequest, NextResponse } from "next/server";
import { validateAdminBasicAuth } from "@/lib/admin/basicAuth";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localeFromPathname,
  preferredLocaleFromRequest,
  stripLocaleFromPathname,
  withLocalePath,
  type Locale,
} from "@/lib/i18n/locales";

const MOBILE_RE = /Mobi|Android|iPhone|iPad/i;
const PUBLIC_FILE_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|json|webmanifest|woff2?)$/i;
const LEGACY_PUBLIC_ROUTES = ["/analyze", "/manual-analysis", "/terms", "/privacy", "/mobile-only", "/result"];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const locale = preferredLocaleFromRequest(req);
  const pathLocale = localeFromPathname(path);
  const normalizedPath = stripLocaleFromPathname(path);
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
    return nextWithLocale(req, locale);
  }

  const allow =
    normalizedPath.startsWith("/mobile-only") ||
    normalizedPath.startsWith("/manual-analysis") ||
    normalizedPath.startsWith("/terms") ||
    normalizedPath.startsWith("/privacy") ||
    normalizedPath.startsWith("/result") ||
    path.startsWith("/admindata") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/fonts") ||
    path.startsWith("/sfx") ||
    PUBLIC_FILE_RE.test(path);

  const shouldSkipLocaleRedirect =
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/fonts") ||
    path.startsWith("/sfx") ||
    path.startsWith("/admindata") ||
    PUBLIC_FILE_RE.test(path);

  if (!shouldSkipLocaleRedirect && !pathLocale && shouldPrefixLocale(path)) {
    return redirectWithLocaleCookie(req, withLocalePath(path, locale), locale);
  }

  if (MOBILE_RE.test(ua) && !allow) {
    return redirectWithLocaleCookie(req, `/${pathLocale ?? locale}/mobile-only`, pathLocale ?? locale);
  }
  return nextWithLocale(req, pathLocale ?? locale);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function shouldPrefixLocale(path: string): boolean {
  if (path === "/") return true;
  return LEGACY_PUBLIC_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

function redirectWithLocaleCookie(req: NextRequest, pathname: string, locale: Locale) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

function nextWithLocale(req: NextRequest, locale: Locale) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
