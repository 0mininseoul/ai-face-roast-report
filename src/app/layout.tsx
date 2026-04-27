import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { socialMetadata, SITE_TITLE } from "@/lib/siteMetadata";
import { getRequestOrigin } from "@/lib/siteUrl";

export function generateMetadata(): Metadata {
  return {
    ...socialMetadata({ baseUrl: getRequestOrigin() }),
    title: {
      default: SITE_TITLE,
      template: `%s - ${SITE_TITLE}`,
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
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg-primary text-text-primary">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
