export function analysisErrorMessage(error: unknown): string {
  const raw = extractErrorText(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes("high demand") || normalized.includes("unavailable") || normalized.includes("service unavailable") || normalized.includes("503")) {
    return "AI 분석 응답이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (normalized.includes("rate_limited") || normalized.includes("429")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (normalized.includes("missing gemini_api_key") || normalized.includes("api key")) {
    return "서비스 설정 문제로 분석을 진행할 수 없습니다.";
  }

  return "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export function isRetryableAnalysisError(error: unknown): boolean {
  const normalized = extractErrorText(error).toLowerCase();
  return normalized.includes("high demand") || normalized.includes("unavailable") || normalized.includes("service unavailable") || normalized.includes("503") || normalized.includes("429");
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
