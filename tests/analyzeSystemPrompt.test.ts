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
    expect(prompt).toContain("여성 선택 시 `씨발`은 금칙어입니다");
  });
});
