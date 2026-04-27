import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const prompt = readFileSync(path.join(process.cwd(), "prompts", "analyze-system.md"), "utf8");

describe("analyze system prompt guardrails", () => {
  it("keeps forehead areaPct citeable while making classification authoritative", () => {
    expect(prompt).toContain("forehead.classification");
    expect(prompt).toContain("`areaPct`의 절대 숫자(%)는 보조 수치로 인용할 수 있습니다");
    expect(prompt).toContain("숫자 단독 단정은 금지합니다");
    expect(prompt).not.toContain("`areaPct`의 절대 숫자(%)를 본문에 인용하지 마세요");
  });

  it("prevents mouth angle noise from becoming personality claims", () => {
    expect(prompt).toContain("`cornerAngleDeg`가 -5도 이상 +5도 이하이면 \"수평\"으로 처리합니다");
    expect(prompt).toContain("`cornerAngleDeg`가 -10도 이상 +10도 이하이면");
    expect(prompt).toContain("성격이나 심리 상태를 단정하지 않습니다");
  });

  it("requires visible skin evidence before negative skin roasting", () => {
    expect(prompt).toContain("피부는 별도 메트릭이 없으므로 첨부 이미지에서 명확히 보이는 정보만 사용합니다");
    expect(prompt).toContain("피부를 억지로 공격하지 말고");
    expect(prompt).toContain("생활 습관이나 인격을 단정하는 표현은 피부 결점이 명확하더라도 피합니다");
  });

  it("preserves the roast tone while banning metric-only inner-state claims", () => {
    expect(prompt).toContain("부위별 절대 수치는 전문성을 위해 적극 인용할 수 있습니다");
    expect(prompt).toContain("메트릭만으로 성격, 인격, 지능, 사회성, 대인관계, 우울/비관 같은 내면 상태를 단정하지 않습니다");
    expect(prompt).toContain("로스팅은 약하게 만들 필요가 없습니다");
  });

  it("bans 씨발 for female-selected users", () => {
    expect(prompt).toContain("여성 선택 시 디시/일베식 말투와 과한 남초 은어는 금지합니다");
    expect(prompt).toContain("`~노`, `하노`, `와꾸`");
    expect(prompt).toContain("`시발`, `씨발`");
    expect(prompt).toContain("`ㅅㅂ`, `ㅈㄴ`과 밈 단어 `와꾸바리`는 사용할 수 있습니다");
  });

  it("bans grade shorthand slang for every user", () => {
    expect(prompt).toContain("모든 성별에서 등급 축약어 `ㅆㅅㅌㅊ`, `ㅅㅌㅊ`, `ㅍㅌㅊ`, `ㅎㅌㅊ`를 쓰지 않습니다");
  });

  it("keeps internal age and user-facing age separated", () => {
    expect(prompt).toContain("사용자에게 보이는 문장에는 절대 직접 언급하지 않습니다");
    expect(prompt).toContain("결론을 제외한 사용자 노출 문장에 쓰는 *표시용 연령*");
    expect(prompt).toContain("`conclusion`에서는 현재 나이를 숫자로 단정하지 않습니다");
    expect(prompt).toContain("한 문단 안에서 서로 다른 연령대 표현을 섞지 마세요");
    expect(prompt).toContain("30대 초반처럼 보이는 인상");
  });

  it("bans raw metric numbers from the final conclusion", () => {
    expect(prompt).toContain("`conclusion`에는 `%`, `도`, `mm`, 점수, 소수점 비율 같은 raw metric 숫자를 직접 쓰지 않습니다");
    expect(prompt).toContain("숫자를 비틀어 \"망할 확률\", \"인생 점수\"처럼 재해석하지 마세요");
  });
});
