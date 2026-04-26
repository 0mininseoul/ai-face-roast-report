import type { Landmark } from "@/types/analysis";

export const TARGET_SAMPLE_COUNT = 18;
export const MIN_FALLBACK_SAMPLE_COUNT = 6;
export const COLLECTION_TIMEOUT_MS = 6000;
export const LONG_WAIT_MS = 12000;
export const SAMPLE_PROGRESS_STEP = 6;

export type AnalysisTrigger = "target_samples" | "timeout_fallback";

export function appendLandmarkSample(samples: Landmark[][], next: Landmark[]): Landmark[][] {
  return [...samples.slice(-(TARGET_SAMPLE_COUNT - 1)), next];
}

export function canStartAnalysis(sampleCount: number, trigger: AnalysisTrigger): boolean {
  return trigger === "target_samples" ? sampleCount >= TARGET_SAMPLE_COUNT : sampleCount >= MIN_FALLBACK_SAMPLE_COUNT;
}

export function sampleProgressBucket(sampleCount: number): number {
  return Math.min(TARGET_SAMPLE_COUNT, Math.floor(sampleCount / SAMPLE_PROGRESS_STEP) * SAMPLE_PROGRESS_STEP);
}
