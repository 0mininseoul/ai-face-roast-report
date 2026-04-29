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
        physiognomy: "외형은 28세 기준으로도 균형이 아쉽고, 20대 후반에서 30대 초반으로 보이는 외모다.",
      },
      conclusion: "28살인데 벌써부터 그러면 30대 되면 더 답이 없겠다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.impression.physiognomy).toContain("33세");
    expect(processed.impression.physiognomy).not.toContain("28세");
    expect(processed.impression.physiognomy).toContain("30대 초반으로 보이는 외모");
    expect(processed.impression.physiognomy).not.toContain("20대 후반");
    expect(processed.conclusion).toContain("30대 초반처럼 보이는 인상인데");
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
    expect(processed.conclusion).toContain("30대 초반처럼 보이는 인상인데");
    expect(processed.conclusion).not.toContain("33살");
  });

  it("aligns age-range claims in the final conclusion to the displayed age range", () => {
    const sections = makeSections({
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 30,
        estimatedAgeReal: 25,
        ageBucket: "under_35",
        physiognomy: "",
      },
      conclusion: "20대 중반처럼 보이는 인상인데 20대 후반처럼 보이는 인상이라니 이상하다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.conclusion).toContain("30대 초반처럼 보이는 인상");
    expect(processed.conclusion).not.toContain("20대 중반");
    expect(processed.conclusion).not.toContain("20대 후반");
  });

  it("cleans awkward age-derived narrative after aligning age ranges", () => {
    const sections = makeSections({
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 30,
        estimatedAgeReal: 25,
        ageBucket: "under_35",
        physiognomy: "30대 후반처럼 보이는 외모에서 오는 생기발랄함과 차분함이 공존하는 인상입니다.",
      },
    });

    const processed = postprocessReportSections(sections);
    expect(processed.impression.physiognomy).toContain("30대 초반처럼 보이는 외모와 차분하고 정돈된 인상");
    expect(processed.impression.physiognomy).not.toContain("30대 후반");
    expect(processed.impression.physiognomy).not.toContain("외모에서 오는 생기발랄함");
  });

  it("cleans self-referential repeated age claims", () => {
    const sections = makeSections({
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 30,
        estimatedAgeReal: 25,
        ageBucket: "under_35",
        physiognomy: "",
      },
      conclusion: "20대 중반처럼 보이는 인상인데 20대 중반처럼 보이는 인상이라고 해놨네 ㅋㅋ 얼굴은 밋밋하다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.conclusion).toContain("30대 초반처럼 보이는 인상입니다");
    expect(processed.conclusion).toContain("얼굴은 밋밋하다");
    expect(processed.conclusion).not.toContain("해놨네");
  });

  it("sanitizes grade slang for all reports", () => {
    const sections = makeSections({
      conclusion: "솔직히 ㅍㅌㅊ는 되냐? 대칭은 ㅆㅅㅌㅊ고 분위기는 ㅎㅌㅊ다.",
    });

    const processed = postprocessReportSections(sections, { gender: "male" });
    expect(processed.conclusion).not.toMatch(/ㅆㅅㅌㅊ|ㅅㅌㅊ|ㅍㅌㅊ|ㅎㅌㅊ/);
    expect(processed.conclusion).toContain("평균권은");
    expect(processed.conclusion).toContain("최상위권");
    expect(processed.conclusion).toContain("하위권");
  });

  it("sanitizes harsh forum slang for female-selected reports while allowing lighter abbreviations", () => {
    const sections = makeSections({
      conclusion: "아따 시발 존나 억울하겠네 ㅋㅋ 구라치노? 솔직히 ㅍㅌㅊ는 되냐? 와꾸가 좀 애매하다. ㅅㅂ ㅈㄴ 와꾸바리 난리다.",
    });

    const processed = postprocessReportSections(sections, { gender: "female" });
    expect(processed.conclusion).not.toMatch(/[씨시]\s*발|존\s*나|좆|ㅍㅌㅊ|와꾸(?!바리)|치노/);
    expect(processed.conclusion).toContain("진짜");
    expect(processed.conclusion).toContain("너무");
    expect(processed.conclusion).toContain("구라치냐?");
    expect(processed.conclusion).toContain("평균권은");
    expect(processed.conclusion).toContain("얼굴이");
    expect(processed.conclusion).toContain("ㅅㅂ");
    expect(processed.conclusion).toContain("ㅈㄴ");
    expect(processed.conclusion).toContain("와꾸바리");
  });

  it("removes casual slang and laughs for reports with displayed age 35 or older", () => {
    const sections = makeSections({
      conclusion: "아 ㅅㅂ 30대 중반처럼 보이는 인상인데 셀카 앱도 답이 없다 ㅋㅋ.",
      mainCopy: "얼굴 보자마자 ㅅㅂ 소리 나온 거 겨우 참음 ㅋㅋ",
      parts: {
        forehead: { metricsText: "", comment: "" },
        eyes: { metricsText: "눈매가 ㅅㅂ 소리 나올 정도로 흐릿하다 ㅋㅋ.", comment: "" },
        nose: { metricsText: "", comment: "" },
        mouth: { metricsText: "", comment: "" },
        jaw: { metricsText: "", comment: "" },
        skin: { observation: "", comment: "" },
      },
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 36,
        estimatedAgeReal: 31,
        ageBucket: "under_35",
        physiognomy: "",
      },
    });

    const processed = postprocessReportSections(sections, { gender: "female" });
    const text = [processed.conclusion, processed.mainCopy, processed.parts.eyes.metricsText].join(" ");
    expect(text).not.toMatch(/[ㅅㅆ]\s*ㅂ|ㅋ{2,}/);
    expect(text).toContain("진짜");
    expect(processed.conclusion).not.toContain("공개 처형문");
  });

  it("removes male profanity when displayed age is 35 or older even if ageBucket is under_35", () => {
    const sections = makeSections({
      conclusion: "씨발 대칭성은 괜찮은데 비율이 좆박아서 존나 답답해 보이는 와꾸다 ㅋㅋ.",
      mainCopy: "와꾸 진짜 좆박았네 ㅋㅋ",
      impression: {
        keywords: ["a", "b", "c"],
        estimatedAge: 37,
        estimatedAgeReal: 32,
        ageBucket: "under_35",
        physiognomy: "",
      },
    });

    const processed = postprocessReportSections(sections, { gender: "male" });
    const text = [processed.conclusion, processed.mainCopy].join(" ");
    expect(text).not.toMatch(/[씨시]\s*발|좆|존\s*나|와꾸|ㅋ{2,}/);
    expect(text).toContain("무너져서");
    expect(text).toContain("얼굴");
    expect(processed.conclusion).not.toContain("공개 처형문");
  });

  it("removes unexplained raw metric claims from the final conclusion", () => {
    const sections = makeSections({
      conclusion:
        "얼굴 비율은 전반적으로 어색하다. 77.4%? 야 77.4%는 비율이 아니라 인생 망할 확률이다. 2.1도 입꼬리? 그건 웃는 게 아니라 굳은 표정이다.",
    });

    const processed = postprocessReportSections(sections);
    expect(processed.conclusion).toContain("얼굴 비율은 전반적으로 어색하다");
    expect(processed.conclusion).not.toContain("77.4%");
    expect(processed.conclusion).not.toContain("2.1도");
    expect(processed.conclusion).not.toContain("77.");
    expect(processed.conclusion).not.toContain("2.");
    expect(processed.conclusion).not.toContain("망할 확률");
    expect(processed.conclusion).not.toContain("그건 웃는 게");
  });

  it("keeps balanced reports profanity-free without adding mocking laughter", () => {
    const sections = makeSections({
      conclusion: "씨발 대칭은 괜찮은데 와꾸가 처참하다 ㅋㅋ.",
      mainCopy: "와꾸 진짜 좆박았네 ㅋㅋ",
    });

    const processed = postprocessReportSections(sections, { gender: "male", tone: "balanced" });
    const text = [processed.conclusion, processed.mainCopy].join(" ");
    expect(text).not.toMatch(/[씨시]\s*발|좆|와꾸|처참|ㅋ{2,}|공개 처형문/);
    expect(text).toContain("대칭은 괜찮은데");
    expect(text).toContain("얼굴");
  });

  it("uses a dry humorous fallback for empty balanced conclusions", () => {
    const processed = postprocessReportSections(makeSections({ conclusion: "" }), { tone: "balanced" });

    expect(processed.conclusion).toContain("출석 체크");
    expect(processed.conclusion).not.toMatch(/촬영|조명|카메라|ㅋ{2,}|[씨시]\s*발|좆|와꾸/);
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
