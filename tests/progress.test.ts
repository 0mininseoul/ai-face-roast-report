import { describe, expect, it } from "vitest";
import { formatProgress, getAnalysisProgress } from "@/lib/analysis/progress";

describe("analysis progress", () => {
  it("formats every progress state as a percentage", () => {
    expect(formatProgress({ percent: 42, label: "테스트" })).toBe("42% 테스트");
  });

  it("uses percent ranges for each process stage", () => {
    expect(progress({ cameraStatus: "requesting" }).percent).toBe(8);
    expect(progress({ isModelLoading: true }).percent).toBe(18);
    expect(progress({ isModelLoading: true }).label).toBe("얼굴 인식 모델 로딩");
    expect(progress({ sampleCount: 9 }).percent).toBe(36);
    expect(progress({ hasStarted: true }).percent).toBe(54);
    expect(progress({ hasStarted: true, hasReportId: true, rawChars: 2600 }).percent).toBe(75);
    expect(progress({ hasStarted: true, hasReportId: true, isComplete: true }).percent).toBe(100);
  });
});

function progress(overrides: Partial<Parameters<typeof getAnalysisProgress>[0]>) {
  return getAnalysisProgress({
    cameraStatus: "ready",
    isModelLoading: false,
    hasStarted: false,
    sampleCount: 0,
    rawChars: 0,
    hasReportId: false,
    isComplete: false,
    ...overrides,
  });
}
