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

interface PostprocessOptions {
  gender?: Gender;
}

export function postprocessReportSections(sections: ReportSections, options: PostprocessOptions = {}): ReportSections {
  const storageSanitized = sanitizeStorageMentions(sections);
  const sanitized = options.gender === "female" ? sanitizeFemaleBannedWords(storageSanitized) : storageSanitized;
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
