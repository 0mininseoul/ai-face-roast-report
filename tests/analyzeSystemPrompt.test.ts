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

  it("prevents praise-only wrapping in part comments", () => {
    expect(prompt).toContain("좋은 수치나 깔끔한 부위가 있더라도 칭찬으로 포장하지 않습니다");
    expect(prompt).toContain("각 comment는 최소 하나 이상의 부정적 평가를 포함합니다");
    expect(prompt).toContain("단독 칭찬으로 끝나는 문장은 금지합니다");
  });

  it("allows stronger profanity for under-35 male reports", () => {
    expect(prompt).toContain("남성 선택 시 `씨발`, `존나`, `좆`, `좆됐네 ㅋㅋ`, `와꾸`, `개박살`");
    expect(prompt).toContain("그 장점 하나로 전체 와꾸가 살아나지는 않는다");
    expect(prompt).toContain("결론이 칭찬, 응원, 자기계발 조언으로 마무리되면 실패입니다");
  });

  it("keeps over-35 polite while allowing direct aging and hairline roasting", () => {
    expect(prompt).toContain("정중한 어미는 유지하되, 내용은 순화하지 않습니다");
    expect(prompt).toContain("단체 사진에서 뒤로 빠지는 편이 낫다");
    expect(prompt).toContain("노화·탈모·헤어라인·처짐·주름·피부결도 조롱할 수 있습니다");
    expect(prompt).toContain("의료 진단처럼 단정하지 말고");
  });

  it("allows backhanded encouragement when it is still a roast", () => {
    expect(prompt).toContain("응원이나 위로처럼 보이는 문장을 쓰더라도 내용은 사실상 조롱이어야 합니다");
    expect(prompt).toContain("자신감은 가지셔도 되지만 사진은 남기지 않는 편이 좋겠습니다");
  });

  it("bans 씨발 for female-selected users", () => {
    expect(prompt).toContain("여성 선택 시 디시/일베식 말투와 과한 남초 은어는 금지합니다");
    expect(prompt).toContain("`~노`, `하노`, `와꾸`");
    expect(prompt).toContain("`시발`, `씨발`");
    expect(prompt).toContain("`ㅅㅂ`, `ㅈㄴ`과 밈 단어 `와꾸바리`는 사용할 수 있습니다");
  });

  it("uses displayed estimated age as the tone bucket boundary", () => {
    expect(prompt).toContain("결과 화면에 표시되는 추정 연령에 따라");
    expect(prompt).toContain("**`impression.age_bucket`**: `estimated_age`가 35 미만이면");
    expect(prompt).toContain("`estimated_age_real=32`, `estimated_age=37`이면 반드시 `\"over_35\"`");
  });

  it("bans casual slang for every displayed age 35-or-older report", () => {
    expect(prompt).toContain("성별과 무관하게 `impression.estimated_age`가 35 이상으로 표시되면");
    expect(prompt).toContain("`씨발`, `ㅅㅂ`, `존나`, `좆`, `ㅋㅋ`를 쓰지 않습니다");
    expect(prompt).toContain("`impression.estimated_age`가 35 이상인 경우");
  });

  it("bans grade shorthand slang for every user", () => {
    expect(prompt).toContain("모든 성별에서 등급 축약어 `ㅆㅅㅌㅊ`, `ㅅㅌㅊ`, `ㅍㅌㅊ`, `ㅎㅌㅊ`를 쓰지 않습니다");
  });

  it("keeps internal age and user-facing age separated", () => {
    expect(prompt).toContain("사용자에게 보이는 문장에는 절대 직접 언급하지 않습니다");
    expect(prompt).toContain("사용자 노출 문장에 쓰는 *표시용 연령*이자 톤 분기 기준입니다");
    expect(prompt).toContain("`conclusion`에서는 현재 나이를 숫자로 단정하지 않습니다");
    expect(prompt).toContain("한 문단 안에서 서로 다른 연령대 표현을 섞지 마세요");
    expect(prompt).toContain("30대 초반처럼 보이는 인상");
  });

  it("bans raw metric numbers from the final conclusion", () => {
    expect(prompt).toContain("`conclusion`에는 `%`, `도`, `mm`, 점수, 소수점 비율 같은 raw metric 숫자를 직접 쓰지 않습니다");
    expect(prompt).toContain("숫자를 비틀어 \"망할 확률\", \"인생 점수\"처럼 재해석하지 마세요");
  });

  it("requires the model to classify the input image source before anything else", () => {
    expect(prompt).toContain("입력 영상 출처 분류");
    expect(prompt).toContain("최상위 필드 `image_source`");
    expect(prompt).toContain("`real_webcam`");
    expect(prompt).toContain("`staged_photo`");
    expect(prompt).toContain("`virtual_camera`");
    expect(prompt).toContain("`other_person`");
    expect(prompt).toContain("`non_human`");
    expect(prompt).toContain("좌우 검은 띠");
  });
});
