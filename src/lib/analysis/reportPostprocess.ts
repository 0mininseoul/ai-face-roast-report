import type { ReportSections } from "@/types/analysis";

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

export function postprocessReportSections(sections: ReportSections): ReportSections {
  const sanitized = sanitizeStorageMentions(sections);
  return {
    ...sanitized,
    conclusion: ensureMockingLaugh(sanitized.conclusion || "최종 결론은 처참하다."),
  };
}

function ensureMockingLaugh(conclusion: string): string {
  if (conclusion.includes("ㅋㅋ")) return conclusion;
  return `${conclusion.trim()} ㅋㅋ 이 정도면 분석 결과가 아니라 공개 처형문에 가깝다.`;
}

function sanitizeStorageMentions(sections: ReportSections): ReportSections {
  return {
    ...sections,
    meta: {
      ...sections.meta,
      complianceText: sanitizeText(sections.meta.complianceText),
    },
    geometry: {
      asymmetry: sanitizeText(sections.geometry.asymmetry),
      phi: sanitizeText(sections.geometry.phi),
      thirds: sanitizeText(sections.geometry.thirds),
      fifths: sanitizeText(sections.geometry.fifths),
      faceAspect: sanitizeText(sections.geometry.faceAspect),
    },
    parts: {
      forehead: sanitizePart(sections.parts.forehead),
      eyes: sanitizePart(sections.parts.eyes),
      nose: sanitizePart(sections.parts.nose),
      mouth: sanitizePart(sections.parts.mouth),
      jaw: sanitizePart(sections.parts.jaw),
      skin: {
        observation: sanitizeText(sections.parts.skin.observation),
        comment: sanitizeText(sections.parts.skin.comment),
      },
    },
    scores: {
      ...sections.scores,
      comments: sections.scores.comments.map(sanitizeText) as [string, string, string, string, string],
    },
    impression: {
      ...sections.impression,
      keywords: sections.impression.keywords.map(sanitizeText),
      physiognomy: sanitizeText(sections.impression.physiognomy),
    },
    conclusion: sanitizeText(sections.conclusion),
    mainCopy: sanitizeText(sections.mainCopy),
  };
}

function sanitizePart<T extends { metricsText: string; comment: string }>(part: T): T {
  return {
    ...part,
    metricsText: sanitizeText(part.metricsText),
    comment: sanitizeText(part.comment),
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
