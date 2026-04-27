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

  it("removes 씨발 variants for female-selected reports", () => {
    const sections = makeSections({
      conclusion: "하 씨발 진짜 답이 없다 ㅋㅋ. 셀카 앱도 포기할 얼굴이다.",
      mainCopy: "얼굴 보자마자 씨 발 소리 나오는 타입",
      parts: {
        forehead: { metricsText: "", comment: "" },
        eyes: { metricsText: "눈 비율이 씨발아 소리 나올 정도다.", comment: "" },
        nose: { metricsText: "", comment: "" },
        mouth: { metricsText: "", comment: "" },
        jaw: { metricsText: "", comment: "" },
        skin: { observation: "", comment: "" },
      },
    });

    const processed = postprocessReportSections(sections, { gender: "female" });
    const text = [
      processed.conclusion,
      processed.mainCopy,
      processed.parts.eyes.metricsText,
    ].join(" ");
    expect(text).not.toMatch(/씨\s*발/);
  });

  it("keeps 씨발 variants for male-selected reports", () => {
    const sections = makeSections({ conclusion: "하 씨발 진짜 답이 없다 ㅋㅋ." });
    expect(postprocessReportSections(sections, { gender: "male" }).conclusion).toContain("씨발");
  });

  it("aligns non-conclusion age mentions to the displayed estimated age", () => {
    const sections = makeSections({
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 33,
        estimatedAgeReal: 28,
        ageBucket: "under_35",
        physiognomy: "외형은 28세 기준으로도 균형이 아쉽다.",
      },
      conclusion: "28살인데 벌써부터 그러면 30대 되면 더 답이 없겠다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.impression.physiognomy).toContain("33세");
    expect(processed.impression.physiognomy).not.toContain("28세");
    expect(processed.conclusion).toContain("20대 후반처럼 보이는 인상인데");
    expect(processed.conclusion).not.toContain("28살");
    expect(processed.conclusion).not.toContain("33살");
    expect(processed.conclusion).toContain("30대 되면");
  });

  it("softens displayed-age claims in the final conclusion", () => {
    const sections = makeSections({
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 33,
        estimatedAgeReal: 28,
        ageBucket: "under_35",
        physiognomy: "",
      },
      conclusion: "33살인데 벌써부터 인상이 무너져 보인다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.conclusion).toContain("20대 후반처럼 보이는 인상인데");
    expect(processed.conclusion).not.toContain("33살");
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
