import { describe, expect, it } from "vitest";
import { TARGET_SAMPLE_COUNT, appendLandmarkSample, canStartAnalysis, sampleProgressBucket } from "@/lib/analysis/sampling";
import type { Landmark } from "@/types/analysis";

describe("analysis sampling", () => {
  it("starts immediately at the target sample count", () => {
    expect(canStartAnalysis(TARGET_SAMPLE_COUNT - 1, "target_samples")).toBe(false);
    expect(canStartAnalysis(TARGET_SAMPLE_COUNT, "target_samples")).toBe(true);
  });

  it("allows timeout fallback after a smaller usable sample set", () => {
    expect(canStartAnalysis(5, "timeout_fallback")).toBe(false);
    expect(canStartAnalysis(6, "timeout_fallback")).toBe(true);
  });

  it("keeps only the latest samples needed for analysis", () => {
    const samples = Array.from({ length: TARGET_SAMPLE_COUNT + 4 }, (_, index) => [point(index)]);
    const next = appendLandmarkSample(samples, [point(999)]);
    expect(next).toHaveLength(TARGET_SAMPLE_COUNT);
    expect(next.at(-1)?.[0]?.x).toBe(999);
  });

  it("reports progress in visible sample buckets", () => {
    expect(sampleProgressBucket(5)).toBe(0);
    expect(sampleProgressBucket(6)).toBe(6);
    expect(sampleProgressBucket(13)).toBe(12);
    expect(sampleProgressBucket(99)).toBe(TARGET_SAMPLE_COUNT);
  });
});

function point(value: number): Landmark {
  return { x: value, y: value, z: 0 };
}
