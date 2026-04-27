import "server-only";
import { headers } from "next/headers";

export function getRequestOrigin() {
  try {
    const headerList = headers();
    const forwardedHost = firstHeaderValue(headerList.get("x-forwarded-host"));
    const host = forwardedHost ?? firstHeaderValue(headerList.get("host"));

    if (host) {
      const forwardedProto = firstHeaderValue(headerList.get("x-forwarded-proto"));
      const protocol = forwardedProto ?? (isLocalHost(host) ? "http" : "https");
      return `${protocol}://${host}`;
    }
  } catch {
    // Build-time metadata generation falls back to configured environment URLs.
  }

  return getConfiguredSiteUrl();
}

function getConfiguredSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit && !isLocalUrl(explicit)) return stripTrailingSlash(explicit);

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${stripTrailingSlash(vercelHost)}`;

  return stripTrailingSlash(explicit ?? "http://localhost:3000");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function isLocalUrl(value: string) {
  return value.includes("localhost") || value.includes("127.0.0.1");
}

function isLocalHost(value: string) {
  return value.includes("localhost") || value.startsWith("127.0.0.1");
}
