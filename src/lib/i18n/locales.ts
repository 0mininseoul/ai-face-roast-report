import type { NextRequest } from "next/server";

export const SUPPORTED_LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "ai_face_locale";
export const LOCALE_HEADER = "x-ai-face-locale";

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALE_SET.has(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeFromPathname(pathname: string): Locale | null {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped.startsWith("/") ? stripped || "/" : `/${stripped}`;
}

export function withLocalePath(pathname: string, locale: Locale): string {
  const stripped = stripLocaleFromPathname(pathname);
  return stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
}

export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag = "", qPart] = part.trim().split(";q=");
      const q = qPart ? Number.parseFloat(qPart) : 1;
      return { base: tag.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const candidate of candidates) {
    if (isLocale(candidate.base)) return candidate.base;
  }
  return DEFAULT_LOCALE;
}

export function preferredLocaleFromRequest(req: NextRequest): Locale {
  const pathLocale = localeFromPathname(req.nextUrl.pathname);
  if (pathLocale) return pathLocale;
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return detectLocaleFromAcceptLanguage(req.headers.get("accept-language"));
}

export function localeToOgLocale(locale: Locale): string {
  if (locale === "en") return "en_US";
  if (locale === "ja") return "ja_JP";
  return "ko_KR";
}

export function localizedResultPath(reportId: string, locale: Locale): string {
  return `/${locale}/result/${reportId}`;
}
