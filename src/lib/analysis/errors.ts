export function analysisErrorMessage(error: unknown): string {
  const raw = extractErrorText(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes("daily_limit_reached")) {
    return "오늘은 이미 5회 분석을 완료했어요. 24시간 뒤에 다시 시도해 주세요.";
  }

  if (normalized.includes("non_live_input")) {
    return "본인 얼굴이 카메라에 직접 비춰져야 분석할 수 있어요. 사진이나 화면에 비친 얼굴은 분석되지 않아요.";
  }

  if (normalized.includes("live_capture_required")) {
    return "얼굴이 너무 정지해 있어서 분석을 시작할 수 없어요. 카메라 앞에서 얼굴을 살짝 움직여 주세요.";
  }

  if (normalized.includes("high demand") || normalized.includes("unavailable") || normalized.includes("service unavailable") || normalized.includes("503")) {
    return "AI 분석 응답이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (normalized.includes("rate_limited") || normalized.includes("429")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (normalized.includes("abort") || normalized.includes("timeout") || normalized.includes("time budget") || normalized.includes("time_budget") || normalized.includes("deadline")) {
    return "AI 분석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (normalized.includes("missing gemini_api_key") || normalized.includes("api key")) {
    return "서비스 설정 문제로 분석을 진행할 수 없습니다.";
  }

  return "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
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
