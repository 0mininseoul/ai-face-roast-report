import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LOCALE_HEADER, normalizeLocale } from "@/lib/i18n/locales";
import { localizedSiteMetadata } from "@/lib/siteMetadata";
import { getRequestOrigin } from "@/lib/siteUrl";

export function generateMetadata(): Metadata {
  const locale = normalizeLocale(headers().get(LOCALE_HEADER));
  const dictionary = getDictionary(locale);
  return {
    ...localizedSiteMetadata(locale, getRequestOrigin()),
    title: {
      default: dictionary.brand.title,
      template: `%s - ${dictionary.brand.title}`,
    },
    icons: {
      icon: [{ url: "/brand/logo.png", type: "image/png", sizes: "512x512" }],
      apple: [{ url: "/brand/logo.png", type: "image/png", sizes: "512x512" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = normalizeLocale(headers().get(LOCALE_HEADER));
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-bg-primary text-text-primary">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
