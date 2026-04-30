import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export function analysisErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const messages = getDictionary(locale).errors;
  const raw = extractErrorText(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes("daily_limit_reached")) {
    return messages.dailyLimit;
  }

  if (normalized.includes("non_live_input")) {
    return messages.nonLive;
  }

  if (normalized.includes("live_capture_required")) {
    return messages.liveCapture;
  }

  if (normalized.includes("high demand") || normalized.includes("unavailable") || normalized.includes("service unavailable") || normalized.includes("503")) {
    return messages.highDemand;
  }

  if (normalized.includes("rate_limited") || normalized.includes("429")) {
    return messages.rateLimited;
  }

  if (normalized.includes("abort") || normalized.includes("timeout") || normalized.includes("time budget") || normalized.includes("time_budget") || normalized.includes("deadline")) {
    return messages.timeout;
  }

  if (normalized.includes("missing gemini_api_key") || normalized.includes("api key")) {
    return messages.config;
  }

  return messages.generic;
}

export function isRetryableAnalysisError(error: unknown): boolean {
  const normalized = extractErrorText(error).toLowerCase();
  return (
    normalized.includes("high demand") ||
    normalized.includes("unavailable") ||
    normalized.includes("service unavailable") ||
    normalized.includes("503") ||
    normalized.includes("429") ||
    normalized.includes("abort") ||
    normalized.includes("timeout") ||
    normalized.includes("time budget") ||
    normalized.includes("time_budget") ||
    normalized.includes("deadline")
  );
}

export function extractErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}
