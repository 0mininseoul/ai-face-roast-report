import { describe, expect, it } from "vitest";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import type { ReportSections } from "@/types/analysis";

describe("postprocessReportSections", () => {
  it("ensures final assessment includes mocking laughter", () => {
    const sections = makeSections({ conclusion: "최종 결론은 처참하다." });
    expect(postprocessReportSections(sections).conclusion).toContain("ㅋㅋ");
  });

  it("keeps existing mocking laughter intact", () => {
    const sections = makeSections({ conclusion: "최종 결론은 처참하다 ㅋㅋ 답이 없다." });
    expect(postprocessReportSections(sections).conclusion).toBe("최종 결론은 처참하다 ㅋㅋ 답이 없다.");
  });
});

function makeSections(overrides: Partial<ReportSections>): ReportSections {
  return {
    meta: { reportId: "report-1", confidence: 90, complianceText: "풍자 목적입니다." },
    geometry: { asymmetry: "", phi: "", thirds: "", fifths: "", faceAspect: "" },
    parts: {
      forehead: { metricsText: "", comment: "" },
      eyes: { metricsText: "", comment: "" },
      nose: { metricsText: "", comment: "" },
      mouth: { metricsText: "", comment: "" },
      jaw: { metricsText: "", comment: "" },
      skin: { observation: "", comment: "" },
    },
    scores: {
      likability: 1,
      trust: 1,
      symmetry: 1,
      balance: 1,
      attractiveness: 1,
      comments: ["", "", "", "", ""],
    },
    impression: { keywords: ["a", "b", "c"], estimatedAge: 20, physiognomy: "" },
    conclusion: "",
    mainCopy: "",
    ...overrides,
  };
}
