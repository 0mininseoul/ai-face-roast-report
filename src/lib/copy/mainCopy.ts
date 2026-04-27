import presets from "../../../content/main-copy-presets.json";
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

export function pickMainCopy(gender: Gender, ageBucket: AgeBucket, seed: string): string {
  const bucket = typedPresets[ageBucket];
  const pool = [...(bucket?.[gender] ?? []), ...(bucket?.neutral ?? [])].filter(Boolean);
  if (pool.length === 0) return FALLBACK_BY_BUCKET[ageBucket];
  return pool[hash(seed) % pool.length]!;
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}
