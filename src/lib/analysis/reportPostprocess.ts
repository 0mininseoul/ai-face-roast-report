import type { AnalysisTone, Gender, ReportSections } from "@/types/analysis";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

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
  [/[씨시]\s*발(?:아|놈|년|새끼)?/gi, "진짜"],
  [/좆\s*나(?:게)?|존\s*나(?:게)?/gi, "너무"],
  [/좆/gi, ""],
  [/와꾸가/gi, "얼굴이"],
  [/와꾸는/gi, "얼굴은"],
  [/와꾸를/gi, "얼굴을"],
  [/와꾸도/gi, "얼굴도"],
  [/와꾸(?!바리)/gi, "얼굴"],
  [/이기야|앙기모띠|노무|게이야/gi, ""],
  [/하노/g, "하냐"],
  [/치노/g, "치냐"],
  [/있노/g, "있냐"],
  [/없노/g, "없냐"],
  [/되노/g, "되냐"],
  [/([가-힣])노([?!….]?)(?=\s|$)/g, "$1냐$2"],
];

const POLITE_TONE_DISPLAY_AGE = 35;

const POLITE_TONE_BANNED_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[ㅅㅆ]\s*ㅂ/gi, "진짜"],
  [/[씨시]\s*발(?:아|놈|년|새끼)?/gi, "진짜"],
  [/좆\s*박아서/gi, "무너져서"],
  [/좆\s*박았다/gi, "무너졌다"],
  [/좆\s*박았/gi, "무너졌"],
  [/좆\s*박은/gi, "무너진"],
  [/좆\s*박/gi, "무너짐"],
  [/좆\s*나(?:게)?|존\s*나(?:게)?/gi, "너무"],
  [/좆/gi, ""],
  [/와꾸가/gi, "얼굴이"],
  [/와꾸는/gi, "얼굴은"],
  [/와꾸를/gi, "얼굴을"],
  [/와꾸도/gi, "얼굴도"],
  [/와꾸/gi, "얼굴"],
  [/병\s*신/gi, "답 없는"],
];

const GENERAL_BANNED_SLANG_REPLACEMENTS: Array<[RegExp, string]> = [
  [/ㅆㅅㅌㅊ는/gi, "최상위권은"],
  [/ㅆㅅㅌㅊ가/gi, "최상위권이"],
  [/ㅆㅅㅌㅊ를/gi, "최상위권을"],
  [/ㅆㅅㅌㅊ/gi, "최상위권"],
  [/ㅍㅌㅊ는/gi, "평균권은"],
  [/ㅍㅌㅊ가/gi, "평균권이"],
  [/ㅍㅌㅊ를/gi, "평균권을"],
  [/ㅍㅌㅊ/gi, "평균권"],
  [/ㅅㅌㅊ는/gi, "상위권은"],
  [/ㅅㅌㅊ가/gi, "상위권이"],
  [/ㅅㅌㅊ를/gi, "상위권을"],
  [/ㅅㅌㅊ/gi, "상위권"],
  [/ㅎㅌㅊ는/gi, "하위권은"],
  [/ㅎㅌㅊ가/gi, "하위권이"],
  [/ㅎㅌㅊ를/gi, "하위권을"],
  [/ㅎㅌㅊ/gi, "하위권"],
];

const BALANCED_TONE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[ㅅㅆ]\s*ㅂ/gi, "정말"],
  [/[씨시]\s*발(?:아|놈|년|새끼)?/gi, "정말"],
  [/좆\s*나(?:게)?|존\s*나(?:게)?/gi, "매우"],
  [/좆/gi, ""],
  [/병\s*신/gi, "아쉬운"],
  [/와꾸/gi, "얼굴"],
  [/개\s*박살/gi, "불균형"],
  [/공개\s*처형문?/gi, "상세 분석"],
  [/외출\s*자제/gi, "촬영 조건 점검"],
  [/처참(?:하다|한|함|하게)?/gi, "아쉬운 편"],
  [/한심(?:하다|한|함|하게)?/gi, "개선 여지가 있는 편"],
  [/못\s*생(?:김|겼|긴|겼다|기|겨)?/gi, "호감도 형성에 불리한"],
];

const AGE_MENTION_RE = /(?<!\d)(\d{1,3})\s*(세|살)(?![기대차])/g;
const AGE_RANGE_LABEL_RE = /(?:10대|20대|30대|40대|50대)\s*(?:초반|중반|후반)|60대\s*이상/g;
const RAW_METRIC_MENTION_RE = /(?<!\d)(?:\d+(?:\.\d+)?\s*(?:%|도|mm|점)|0\.\d+)(?!\d)/;

interface PostprocessOptions {
  gender?: Gender;
  tone?: AnalysisTone;
  locale?: Locale;
}

export function postprocessReportSections(sections: ReportSections, options: PostprocessOptions = {}): ReportSections {
  const locale = options.locale ?? DEFAULT_LOCALE;
  if (locale !== "ko") {
    return postprocessInternationalReportSections(sections, { ...options, locale });
  }

  const hasOriginalConclusion = Boolean(sections.conclusion?.trim());
  const storageSanitized = sanitizeStorageMentions(sections);
  const ageAligned = alignUserFacingAgeMentions(storageSanitized);
  const slangSanitized = sanitizeGeneralBannedSlang(ageAligned);
  const femaleSanitized = options.gender === "female" ? sanitizeFemaleBannedWords(slangSanitized) : slangSanitized;
  const usesPoliteTone = usesPoliteReportTone(femaleSanitized);
  const toneSanitized = options.tone === "balanced" ? sanitizeBalancedTone(femaleSanitized) : femaleSanitized;
  const sanitized = usesPoliteTone || options.tone === "balanced" ? sanitizePoliteTone(toneSanitized) : toneSanitized;
  const fallbackConclusion = usesPoliteTone
    ? "전반적으로 호감도 형성에 불리한 신호가 다수 관찰됩니다."
    : "최종 결론은 처참하다.";
  const balancedConclusion =
    "전체적으로 안정적인 지점과 개선 여지가 함께 관찰됩니다. 첫인상은 크게 무너지지 않지만, 표정이 너무 중립적이라 호감도보다 출석 체크가 먼저 떠오르는 타입입니다.";
  const conclusion =
    options.tone === "balanced" && !hasOriginalConclusion
      ? balancedConclusion
      : sanitized.conclusion?.trim() || (options.tone === "balanced" ? balancedConclusion : fallbackConclusion);
  if (options.tone === "balanced") {
    return {
      ...sanitized,
      conclusion: stripCasualLaughs(conclusion),
      mainCopy: stripCasualLaughs(sanitized.mainCopy),
    };
  }

  return {
    ...sanitized,
    conclusion: usesPoliteTone ? stripCasualLaughs(conclusion) : ensureMockingLaugh(conclusion),
    mainCopy: usesPoliteTone ? stripCasualLaughs(sanitized.mainCopy) : sanitized.mainCopy,
  };
}

function postprocessInternationalReportSections(
  sections: ReportSections,
  options: PostprocessOptions & { locale: Exclude<Locale, "ko"> },
): ReportSections {
  const hasOriginalConclusion = Boolean(sections.conclusion?.trim());
  const sanitized = mapReportText(sections, (text) => sanitizeInternationalText(text, options.locale));
  const fallbackConclusion =
    options.locale === "ja"
      ? "全体的に印象と比率にいくつかの弱点が見られます。"
      : "Overall, several signals work against the first impression.";
  const balancedConclusion =
    options.locale === "ja"
      ? "全体的に安定した部分と改善余地が一緒に見られます。第一印象は大きく崩れていませんが、表情が落ち着きすぎて少し事務的に見えます。"
      : "Overall, stable points and areas for improvement appear together. The first impression does not collapse, but the expression is neutral enough to feel a little administrative.";

  return {
    ...sanitized,
    conclusion:
      options.tone === "balanced" && !hasOriginalConclusion
        ? balancedConclusion
        : sanitized.conclusion?.trim() || (options.tone === "balanced" ? balancedConclusion : fallbackConclusion),
    mainCopy: sanitized.mainCopy?.trim() || "",
  };
}

export function alignUserFacingAgeMentions(sections: ReportSections): ReportSections {
  const displayAge = normalizedAge(sections.impression.estimatedAge);
  const realAge = normalizedAge(sections.impression.estimatedAgeReal);
  if (displayAge === null) return sections;

  const aligned = mapReportText(sections, (text) => sanitizeAgeNarrative(alignAgeText(text, displayAge, realAge), displayAge));
  return {
    ...aligned,
    conclusion: stripRawMetricClaimsFromConclusion(sanitizeAgeNarrative(softenConclusionAgeClaims(sections.conclusion, displayAge, realAge), displayAge)),
  };
}

function alignAgeText(text: string, displayAge: number, realAge: number | null): string {
  const displayDecade = Math.floor(displayAge / 10) * 10;
  const realDecade = realAge === null ? null : Math.floor(realAge / 10) * 10;
  const displayRange = ageRangeLabel(displayAge);

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

  return alignAgeRangeMentions(next, displayRange);
}

function softenConclusionAgeClaims(text: string, displayAge: number, realAge: number | null): string {
  const appearancePhrase = `${ageRangeLabel(displayAge)}처럼 보이는 인상`;

  const softened = text.replace(AGE_MENTION_RE, (match, rawAge: string) => {
    const mentionedAge = Number(rawAge);
    if (!Number.isInteger(mentionedAge)) return match;
    const matchesDisplayAge = Math.abs(mentionedAge - displayAge) <= 1;
    const matchesRealAge = realAge !== null && Math.abs(mentionedAge - realAge) <= 1;
    return matchesDisplayAge || matchesRealAge ? appearancePhrase : match;
  });

  return alignAgeRangeMentions(softened, ageRangeLabel(displayAge));
}

function ageRangeLabel(age: number): string {
  if (age < 20) return "앳된 나이대";
  const decade = Math.floor(age / 10) * 10;
  if (age >= 60) return "60대 이상";

  const unit = age % 10;
  const segment = unit <= 3 ? "초반" : unit <= 6 ? "중반" : "후반";
  return `${decade}대 ${segment}`;
}

function stripRawMetricClaimsFromConclusion(conclusion: string): string {
  const pieces = splitConclusionPieces(conclusion);
  let removedPreviousMetricClaim = false;
  const stripped = pieces
    .filter((piece) => {
      if (RAW_METRIC_MENTION_RE.test(piece)) {
        removedPreviousMetricClaim = true;
        return false;
      }
      if (removedPreviousMetricClaim && /^\s*(?:야\s*)?(?:그건|그게|그 수치|그 숫자|그 정도)/.test(piece)) {
        removedPreviousMetricClaim = false;
        return false;
      }
      removedPreviousMetricClaim = false;
      return true;
    })
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return stripped || "전반적으로 인상과 비례가 호감도 형성에 불리하게 작용합니다.";
}

function alignAgeRangeMentions(text: string, displayRange: string): string {
  const escapedDisplayRange = escapeRegExp(displayRange);
  return text
    .replace(AGE_RANGE_LABEL_RE, displayRange)
    .replace(new RegExp(`${escapedDisplayRange}\\s*에서\\s*${escapedDisplayRange}`, "g"), displayRange)
    .replace(new RegExp(`${escapedDisplayRange}\\s*,\\s*${escapedDisplayRange}`, "g"), displayRange)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeAgeNarrative(text: string, displayAge: number): string {
  const displayRange = ageRangeLabel(displayAge);
  return text
    .replace(new RegExp(`${escapeRegExp(displayRange)}처럼 보이는 인상인데\\s*${escapeRegExp(displayRange)}처럼 보이는 인상이라고\\s*[^.!?。ㅋ]*(?:ㅋ+)?`, "g"), `${displayRange}처럼 보이는 인상입니다.`)
    .replace(new RegExp(`${escapeRegExp(displayRange)}처럼 보이는 외모에서 오는\\s*`, "g"), `${displayRange}처럼 보이는 외모와 `)
    .replace(new RegExp(`${escapeRegExp(displayRange)}에서 오는\\s*`, "g"), "")
    .replace(/생기발랄함과 차분함이 공존하는 인상/g, "차분하고 정돈된 인상")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitConclusionPieces(text: string): string[] {
  const pieces: string[] = [];
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== "." && char !== "!" && char !== "?" && char !== "。") continue;
    if (char === "." && isDigit(text[index - 1]) && isDigit(text[index + 1])) continue;

    pieces.push(text.slice(start, index + 1));
    start = index + 1;
  }

  if (start < text.length) pieces.push(text.slice(start));
  return pieces.length > 0 ? pieces : [text];
}

function isDigit(char: string | undefined): boolean {
  return Boolean(char && /\d/.test(char));
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

function sanitizePoliteTone(sections: ReportSections): ReportSections {
  return mapReportText(sections, sanitizePoliteToneText);
}

function sanitizeBalancedTone(sections: ReportSections): ReportSections {
  return mapReportText(sections, sanitizeBalancedToneText);
}

function sanitizeGeneralBannedSlang(sections: ReportSections): ReportSections {
  return mapReportText(sections, sanitizeGeneralBannedSlangText);
}

function usesPoliteReportTone(sections: ReportSections): boolean {
  const displayAge = normalizedAge(sections.impression.estimatedAge);
  return sections.impression.ageBucket === "over_35" || (displayAge !== null && displayAge >= POLITE_TONE_DISPLAY_AGE);
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

function sanitizeInternationalText(text: string, locale: Exclude<Locale, "ko">): string {
  const storagePattern =
    locale === "ja"
      ? /[^.!?\n。]*?(?:サーバー|DB|データベース|ストレージ)[^.!?\n。]*?(?:保存|保管|アップロード|送信|記録)[^.!?\n。]*[.!?。]?/gi
      : /[^.!?\n。]*?(?:server|db|database|storage)[^.!?\n。]*?(?:save|store|upload|transmit|record)[^.!?\n。]*[.!?。]?/gi;

  return sanitizeSensitiveSexualExperience(text)
    .replace(storagePattern, "")
    .replace(/\bvirgin(?:ity)?\b/gi, "private life")
    .replace(/処女|童貞|性経験/g, "私生活")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeSensitiveSexualExperience(text: string): string {
  return SENSITIVE_SEXUAL_EXPERIENCE_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function sanitizeFemaleBannedText(text: string): string {
  return FEMALE_BANNED_WORD_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/([가-힣]+권)가는/g, "$1은")
    .replace(/([가-힣]+권)는/g, "$1은")
    .replace(/([가-힣]+권)가/g, "$1이")
    .replace(/\.\s*\?/g, ".")
    .replace(/^\?\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizePoliteToneText(text: string): string {
  return stripCasualLaughs(POLITE_TONE_BANNED_WORD_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeGeneralBannedSlangText(text: string): string {
  return GENERAL_BANNED_SLANG_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeBalancedToneText(text: string): string {
  return stripCasualLaughs(BALANCED_TONE_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text))
    .replace(/\s{2,}/g, " ")
    .trim();
}
