import type { Gender, ReportSections } from "@/types/analysis";

const SENSITIVE_SEXUAL_EXPERIENCE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/모\s*쏠\s*아\s*다/gi, "연애 운까지 박살난 타입"],
  [/(?<![가-힣])아\s*다(?:인|인지|라서|라니|야|냐|구나|네|임|입니다)?(?![가-힣])/gi, "사회성까지 박살난 타입"],
  [/(?<![가-힣])처\s*녀(?:인|인지|라서|라니|야|냐|구나|네|임|입니다)?(?![가-힣])/gi, "사회성까지 박살난 타입"],
  [/(?<![가-힣])동\s*정(?:남|녀|충)?(?:인|인지|라서|라니|야|냐|구나|네|임|입니다)?(?![가-힣])/gi, "사회성까지 박살난 타입"],
  [/성\s*경\s*험/gi, "사생활"],
  [/순\s*결/gi, "사생활"],
  [/virginity/gi, "사생활"],
  [/(?<![a-z])virgin(?![a-z])/gi, "사생활"],
];

const FEMALE_BANNED_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/씨\s*발(?:아|놈|년|새끼)?/gi, "진짜"],
];

const AGE_MENTION_RE = /(?<!\d)(\d{1,3})\s*(세|살)(?![기대차])/g;

interface PostprocessOptions {
  gender?: Gender;
}

export function postprocessReportSections(sections: ReportSections, options: PostprocessOptions = {}): ReportSections {
  const storageSanitized = sanitizeStorageMentions(sections);
  const ageAligned = alignUserFacingAgeMentions(storageSanitized);
  const sanitized = options.gender === "female" ? sanitizeFemaleBannedWords(ageAligned) : ageAligned;
  const isOver35 = sanitized.impression.ageBucket === "over_35";
  const fallbackConclusion = isOver35
    ? "전반적으로 호감도 형성에 불리한 신호가 다수 관찰됩니다."
    : "최종 결론은 처참하다.";
  const conclusion = sanitized.conclusion?.trim() || fallbackConclusion;
  return {
    ...sanitized,
    conclusion: isOver35 ? stripCasualLaughs(conclusion) : ensureMockingLaugh(conclusion),
    mainCopy: isOver35 ? stripCasualLaughs(sanitized.mainCopy) : sanitized.mainCopy,
  };
}

export function alignUserFacingAgeMentions(sections: ReportSections): ReportSections {
  const displayAge = normalizedAge(sections.impression.estimatedAge);
  const realAge = normalizedAge(sections.impression.estimatedAgeReal);
  if (displayAge === null) return sections;

  const aligned = mapReportText(sections, (text) => alignAgeText(text, displayAge, realAge));
  return {
    ...aligned,
    conclusion: softenConclusionAgeClaims(sections.conclusion, displayAge, realAge),
  };
}

function alignAgeText(text: string, displayAge: number, realAge: number | null): string {
  const displayDecade = Math.floor(displayAge / 10) * 10;
  const realDecade = realAge === null ? null : Math.floor(realAge / 10) * 10;

  let next = text.replace(AGE_MENTION_RE, (match, rawAge: string, unit: string) => {
    const mentionedAge = Number(rawAge);
    if (!Number.isInteger(mentionedAge) || mentionedAge === displayAge) return match;
    if (realAge !== null && Math.abs(mentionedAge - realAge) <= 1) return `${displayAge}${unit}`;
    return match;
  });

  if (realDecade !== null && realDecade !== displayDecade) {
    next = next.replace(new RegExp(`${realDecade}대`, "g"), `${displayDecade}대`);
    next = next.replace(new RegExp(`${displayDecade}대\\s*(?:가\\s*)?(?:되면|된다면|들어서면|진입하면)`, "g"), "시간이 더 지나면");
  }

  return next;
}

function softenConclusionAgeClaims(text: string, displayAge: number, realAge: number | null): string {
  const appearancePhrase = `${ageRangeLabel(realAge ?? displayAge)}처럼 보이는 인상`;

  return text.replace(AGE_MENTION_RE, (match, rawAge: string) => {
    const mentionedAge = Number(rawAge);
    if (!Number.isInteger(mentionedAge)) return match;
    const matchesDisplayAge = Math.abs(mentionedAge - displayAge) <= 1;
    const matchesRealAge = realAge !== null && Math.abs(mentionedAge - realAge) <= 1;
    return matchesDisplayAge || matchesRealAge ? appearancePhrase : match;
  });
}

function ageRangeLabel(age: number): string {
  if (age < 20) return "앳된 나이대";
  const decade = Math.floor(age / 10) * 10;
  if (age >= 60) return "60대 이상";

  const unit = age % 10;
  const segment = unit <= 3 ? "초반" : unit <= 6 ? "중반" : "후반";
  return `${decade}대 ${segment}`;
}

function normalizedAge(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const age = Math.round(value);
  return age > 0 ? age : null;
}

function ensureMockingLaugh(conclusion: string): string {
  if (conclusion.includes("ㅋㅋ")) return conclusion;
  return `${conclusion.trim()} ㅋㅋ 이 정도면 분석 결과가 아니라 공개 처형문에 가깝다.`;
}

function stripCasualLaughs(text: string): string {
  return text.replace(/ㅋ{2,}/g, "").replace(/\s{2,}/g, " ").trim();
}

function sanitizeStorageMentions(sections: ReportSections): ReportSections {
  return mapReportText(sections, sanitizeText);
}

function sanitizeFemaleBannedWords(sections: ReportSections): ReportSections {
  return mapReportText(sections, sanitizeFemaleBannedText);
}

function mapReportText(sections: ReportSections, mapText: (text: string) => string): ReportSections {
  return {
    ...sections,
    meta: {
      ...sections.meta,
      complianceText: mapText(sections.meta.complianceText),
    },
    geometry: {
      asymmetry: mapText(sections.geometry.asymmetry),
      phi: mapText(sections.geometry.phi),
      thirds: mapText(sections.geometry.thirds),
      fifths: mapText(sections.geometry.fifths),
      faceAspect: mapText(sections.geometry.faceAspect),
    },
    parts: {
      forehead: mapPartText(sections.parts.forehead, mapText),
      eyes: mapPartText(sections.parts.eyes, mapText),
      nose: mapPartText(sections.parts.nose, mapText),
      mouth: mapPartText(sections.parts.mouth, mapText),
      jaw: mapPartText(sections.parts.jaw, mapText),
      skin: {
        observation: mapText(sections.parts.skin.observation),
        comment: mapText(sections.parts.skin.comment),
      },
    },
    scores: {
      ...sections.scores,
      comments: sections.scores.comments.map(mapText) as [string, string, string, string, string],
    },
    impression: {
      ...sections.impression,
      keywords: sections.impression.keywords.map(mapText),
      physiognomy: mapText(sections.impression.physiognomy),
    },
    conclusion: mapText(sections.conclusion),
    mainCopy: mapText(sections.mainCopy),
  };
}

function mapPartText<T extends { metricsText: string; comment: string }>(part: T, mapText: (text: string) => string): T {
  return {
    ...part,
    metricsText: mapText(part.metricsText),
    comment: mapText(part.comment),
  };
}

export function sanitizeText(text: string): string {
  return sanitizeSensitiveSexualExperience(text)
    .replace(/[^.!?\n。]*?(?:서버|DB|데이터베이스|저장소)[^.!?\n。]*?(?:저장|보관|업로드|전송|남기|기록)[^.!?\n。]*[.!?。]?/gi, "")
    .replace(/[^.!?\n。]*?(?:저장|보관|업로드|전송|기록)[^.!?\n。]*?(?:서버|DB|데이터베이스|저장소)[^.!?\n。]*[.!?。]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeSensitiveSexualExperience(text: string): string {
  return SENSITIVE_SEXUAL_EXPERIENCE_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function sanitizeFemaleBannedText(text: string): string {
  return FEMALE_BANNED_WORD_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/\s{2,}/g, " ")
    .trim();
}
