import { describe, expect, it } from "vitest";
import { analysisErrorMessage, isRetryableAnalysisError } from "@/lib/analysis/errors";

describe("analysis errors", () => {
  it("normalizes provider high-demand errors for users", () => {
    const providerError = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');

    expect(isRetryableAnalysisError(providerError)).toBe(true);
    expect(analysisErrorMessage(providerError)).toBe("AI 분석 응답이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("treats local timeout guards as retryable provider delays", () => {
    const timeoutError = new Error("analysis_time_budget_exceeded");

    expect(isRetryableAnalysisError(timeoutError)).toBe(true);
    expect(analysisErrorMessage(timeoutError)).toBe("AI 분석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
  });
});
