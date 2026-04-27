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

  it("removes service storage mentions from generated report copy", () => {
    const sections = makeSections({
      conclusion: "니 와꾸 분석 데이터를 서버에 저장하는 것 자체가 자원 낭비다 ㅋㅋ. 그래도 결론은 처참하다.",
      geometry: {
        asymmetry: "서버에 저장된 데이터 기준으로 비대칭이 나쁘다.",
        phi: "황금비가 낮다.",
        thirds: "삼정이 흔들린다.",
        fifths: "오관이 어색하다.",
        faceAspect: "안면비가 답답하다.",
      },
    });

    const processed = postprocessReportSections(sections);
    expect(processed.conclusion).not.toContain("서버");
    expect(processed.conclusion).not.toContain("저장");
    expect(processed.geometry.asymmetry).not.toContain("서버");
  });

  it("sanitizes sexual experience terms from generated report copy", () => {
    const sections = makeSections({
      conclusion: "분석 결과 보니까 왜 모쏠아다인지 알겠다 ㅋㅋ. 아다 티 내지 말고 거울부터 봐라.",
      mainCopy: "성경험 없어 보이는 처녀 관상",
      scores: {
        likability: 1,
        trust: 1,
        symmetry: 1,
        balance: 1,
        attractiveness: 1,
        comments: ["동정남 느낌", "", "", "", ""],
      },
    });

    const processed = postprocessReportSections(sections);
    const text = [processed.conclusion, processed.mainCopy, ...processed.scores.comments].join(" ");
    expect(text).not.toMatch(/모쏠아다|아다|처녀|동정|성경험/);
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
    impression: {
      keywords: ["a", "b", "c"],
      estimatedAge: 20,
      estimatedAgeReal: 20,
      ageBucket: "under_35",
      physiognomy: "",
    },
    conclusion: "",
    mainCopy: "",
    ...overrides,
  };
}
