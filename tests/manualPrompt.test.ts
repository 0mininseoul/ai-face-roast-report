import { describe, expect, it } from "vitest";
import { buildAnalysisSystemInstruction } from "@/lib/gemini/manualPrompt";

describe("buildAnalysisSystemInstruction", () => {
  it("adds locale output instructions for normal roast webcam reports", () => {
    const prompt = buildAnalysisSystemInstruction("base", "live_webcam", "roast");

    expect(prompt).toContain("base");
    expect(prompt).toContain("출력 언어");
    expect(prompt).toContain("JSON key 이름과 enum 값은 스키마 그대로 유지합니다");
  });

  it("adds target-language instructions for English and Japanese reports", () => {
    expect(buildAnalysisSystemInstruction("base", "live_webcam", "roast", "en")).toContain("Write every user-facing text field");
    expect(buildAnalysisSystemInstruction("base", "live_webcam", "roast", "ja")).toContain("自然な日本語");
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
