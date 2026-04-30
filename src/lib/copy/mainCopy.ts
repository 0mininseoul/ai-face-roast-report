import presets from "../../../content/main-copy-presets.json";
import enPresets from "../../../content/main-copy-presets.en.json";
import jaPresets from "../../../content/main-copy-presets.ja.json";
import balancedPresets from "../../../content/balanced-main-copy-presets.json";
import balancedEnPresets from "../../../content/balanced-main-copy-presets.en.json";
import balancedJaPresets from "../../../content/balanced-main-copy-presets.ja.json";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import type { AgeBucket, Gender } from "@/types/analysis";

type BucketCopies = {
  neutral: string[];
  male: string[];
  female: string[];
};

type MainCopyPresets = {
  under_35: BucketCopies;
  over_35: BucketCopies;
};

const FALLBACK_BY_BUCKET: Record<AgeBucket, string> = {
  under_35: "분석은 끝났고 결과는 잔인함",
  over_35: "본 분석 결과를 받아들이시는 데에 시간이 필요해 보입니다.",
};

const typedPresets = presets as MainCopyPresets;
const typedEnPresets = enPresets as MainCopyPresets;
const typedJaPresets = jaPresets as MainCopyPresets;
const typedBalancedPresets = balancedPresets as MainCopyPresets;
const typedBalancedEnPresets = balancedEnPresets as MainCopyPresets;
const typedBalancedJaPresets = balancedJaPresets as MainCopyPresets;

export function pickMainCopy(gender: Gender, ageBucket: AgeBucket, seed: string, locale: Locale = DEFAULT_LOCALE): string {
  const bucket = presetByLocale(locale)[ageBucket];
  const pool = [...(bucket?.[gender] ?? []), ...(bucket?.neutral ?? [])].filter(Boolean);
  if (pool.length === 0) return fallbackByLocale(locale, ageBucket);
  return pool[hash(seed) % pool.length]!;
}

export function pickBalancedMainCopy(gender: Gender, ageBucket: AgeBucket, seed: string, locale: Locale = DEFAULT_LOCALE): string {
  const bucket = balancedPresetByLocale(locale)[ageBucket];
  const pool = [...(bucket?.[gender] ?? []), ...(bucket?.neutral ?? [])].filter(Boolean);
  const fallback = balancedFallbackByLocale(locale);
  if (pool.length === 0) return fallback;
  return sanitizeBalancedCopy(pool[hash(seed) % pool.length]!, locale) ?? fallback;
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function presetByLocale(locale: Locale): MainCopyPresets {
  if (locale === "en") return typedEnPresets;
  if (locale === "ja") return typedJaPresets;
  return typedPresets;
}

function balancedPresetByLocale(locale: Locale): MainCopyPresets {
  if (locale === "en") return typedBalancedEnPresets;
  if (locale === "ja") return typedBalancedJaPresets;
  return typedBalancedPresets;
}

function fallbackByLocale(locale: Locale, ageBucket: AgeBucket): string {
  if (locale === "en") return ageBucket === "under_35" ? "The analysis is done, and the result is brutal" : "This report may take a moment to accept.";
  if (locale === "ja") return ageBucket === "under_35" ? "分析は完了、結果はかなり辛口です" : "本分析結果を受け入れるには少し時間が必要そうです。";
  return FALLBACK_BY_BUCKET[ageBucket];
}

function balancedFallbackByLocale(locale: Locale): string {
  if (locale === "en") return "A face with enough first-impression warmth to work with";
  if (locale === "ja") return "第一印象で十分に好感を残せる顔です";
  return "첫인상에서 호감은 충분히 가져가는 얼굴입니다";
}

function sanitizeBalancedCopy(value: string | null | undefined, locale: Locale): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "-" || trimmed.length < 8) return null;
  if (locale === "ko" && /[ㅅㅆ]\s*ㅂ|[씨시]\s*발|좆|존\s*나|좆\s*나|병\s*신|와꾸|개\s*박살|처참|한심|못\s*생/gi.test(trimmed)) return null;
  return trimmed.replace(/ㅋ{2,}/g, "").slice(0, 80).trim() || null;
}
