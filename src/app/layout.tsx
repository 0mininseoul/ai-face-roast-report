import "./globals.css";
import type { Metadata, Viewport } from "next";

const SITE = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "AI 얼평보고서",
    template: "%s - AI 얼평보고서",
  },
  description: "Forensic-grade facial diagnostics. Powered by AI.",
  openGraph: {
    title: "AI 얼평보고서",
    description: "Forensic-grade facial diagnostics. Powered by AI.",
    url: "/",
    siteName: "AI 얼평보고서",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 얼평보고서",
    description: "Forensic-grade facial diagnostics. Powered by AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/brand/logo.png", type: "image/png", sizes: "512x512" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg-primary text-text-primary">{children}</body>
    </html>
  );
}

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit && !explicit.includes("localhost")) return explicit.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return explicit ?? "http://localhost:3000";
}
