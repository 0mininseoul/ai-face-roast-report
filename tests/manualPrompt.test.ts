import { describe, expect, it } from "vitest";
import { buildAnalysisSystemInstruction } from "@/lib/gemini/manualPrompt";

describe("buildAnalysisSystemInstruction", () => {
  it("keeps the base prompt unchanged for normal roast webcam reports", () => {
    expect(buildAnalysisSystemInstruction("base", "live_webcam", "roast")).toBe("base");
  });

  it("adds manual upload and balanced tone instructions when requested", () => {
    const prompt = buildAnalysisSystemInstruction("base", "manual_upload", "balanced");

    expect(prompt).toContain("관리자 승인 수동 업로드 예외");
    expect(prompt).toContain("객관 평가 모드");
    expect(prompt).toContain("욕설·비속어·모욕성 표현·과도한 조롱을 절대 사용하지 마세요");
    expect(prompt).toContain("반드시 장점 또는 방어되는 지점을 함께 포함");
    expect(prompt).toContain("의도적으로 부풀리거나 낮추지 마세요");
    expect(prompt).toContain("정확해서 웃긴");
    expect(prompt).toContain("정중한 한 줄 반전");
  });
});
