import presets from "../../../content/main-copy-presets.json";
import type { Gender } from "@/types/analysis";

type MainCopyPresets = {
  neutral: string[];
  male: string[];
  female: string[];
};

const typedPresets = presets as MainCopyPresets;

export function pickMainCopy(gender: Gender, seed: string): string {
  const genderCopies = typedPresets[gender] ?? [];
  const pool = [...genderCopies, ...typedPresets.neutral].filter(Boolean);
  if (pool.length === 0) return "분석은 끝났고 결과는 잔인함";
  return pool[hash(seed) % pool.length]!;
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}
