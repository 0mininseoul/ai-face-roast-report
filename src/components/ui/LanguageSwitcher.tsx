"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, stripLocaleFromPathname, withLocalePath, type Locale } from "@/lib/i18n/locales";

const LABELS: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
};

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="inline-flex rounded-md border border-border bg-bg-card/70 p-0.5 text-xs font-black text-text-muted">
      {SUPPORTED_LOCALES.map((target) => {
        const href = `${withLocalePath(stripLocaleFromPathname(pathname || "/"), target)}${query ? `?${query}` : ""}`;
        const active = target === locale;
        return (
          <Link
            key={target}
            href={href}
            hrefLang={target}
            aria-current={active ? "true" : undefined}
            className={[
              "rounded px-2.5 py-1.5 transition hover:text-text-primary",
              active ? "bg-accent-info text-bg-primary" : "text-text-muted",
            ].join(" ")}
            onClick={() => {
              document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
            }}
          >
            {LABELS[target]}
          </Link>
        );
      })}
    </div>
  );
}
