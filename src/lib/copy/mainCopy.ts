import presets from "../../../content/main-copy-presets.json";
import balancedPresets from "../../../content/balanced-main-copy-presets.json";
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
const typedBalancedPresets = balancedPresets as MainCopyPresets;

export function pickMainCopy(gender: Gender, ageBucket: AgeBucket, seed: string): string {
  const bucket = typedPresets[ageBucket];
  const pool = [...(bucket?.[gender] ?? []), ...(bucket?.neutral ?? [])].filter(Boolean);
  if (pool.length === 0) return FALLBACK_BY_BUCKET[ageBucket];
  return pool[hash(seed) % pool.length]!;
}

export function pickBalancedMainCopy(gender: Gender, ageBucket: AgeBucket, seed: string): string {
  const bucket = typedBalancedPresets[ageBucket];
  const pool = [...(bucket?.[gender] ?? []), ...(bucket?.neutral ?? [])].filter(Boolean);
  if (pool.length === 0) return "첫인상에서 호감은 충분히 가져가는 얼굴입니다";
  return sanitizeBalancedCopy(pool[hash(seed) % pool.length]!) ?? "첫인상에서 호감은 충분히 가져가는 얼굴입니다";
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function sanitizeBalancedCopy(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "-" || trimmed.length < 8) return null;
  if (/[ㅅㅆ]\s*ㅂ|[씨시]\s*발|좆|존\s*나|좆\s*나|병\s*신|와꾸|개\s*박살|처참|한심|못\s*생/gi.test(trimmed)) return null;
  return trimmed.replace(/ㅋ{2,}/g, "").slice(0, 80).trim() || null;
}
