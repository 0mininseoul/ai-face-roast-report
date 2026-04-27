import { describe, expect, it } from "vitest";
import {
  HARD_BLOCK_VARIANCE,
  MIN_LANDMARK_VARIANCE,
  computeLivenessSignal,
  isLivenessAcceptable,
  isLivenessHardBlocked,
} from "@/lib/analysis/liveness";
import type { Landmark } from "@/types/analysis";

const LANDMARK_COUNT = 478;

describe("liveness detection", () => {
  it("flags zero-variance samples as hard-blocked (static image / virtual camera)", () => {
    const sample = baselineLandmarks();
    const samples = Array.from({ length: 18 }, () => sample.map((point) => ({ ...point })));
    const signal = computeLivenessSignal(samples);
    expect(signal.variance).toBeLessThan(1e-10);
    expect(isLivenessHardBlocked(signal)).toBe(true);
    expect(isLivenessAcceptable(signal)).toBe(false);
  });

  it("accepts samples with realistic micro-jitter from a live face", () => {
    const sample = baselineLandmarks();
    const samples = Array.from({ length: 18 }, (_, sampleIndex) =>
      sample.map((point, index) => ({
        x: point.x + jitter(sampleIndex, index, 0),
        y: point.y + jitter(sampleIndex, index, 1),
        z: point.z,
      })),
    );
    const signal = computeLivenessSignal(samples);
    expect(signal.variance).toBeGreaterThan(MIN_LANDMARK_VARIANCE);
    expect(isLivenessHardBlocked(signal)).toBe(false);
    expect(isLivenessAcceptable(signal)).toBe(true);
  });

  it("keeps the hard-block threshold strictly tighter than the soft threshold", () => {
    expect(HARD_BLOCK_VARIANCE).toBeLessThan(MIN_LANDMARK_VARIANCE);
  });

  it("returns zero variance for fewer than two samples", () => {
    const empty = computeLivenessSignal([]);
    const single = computeLivenessSignal([baselineLandmarks()]);
    expect(empty.variance).toBe(0);
    expect(single.variance).toBe(0);
  });
});

function baselineLandmarks(): Landmark[] {
  return Array.from({ length: LANDMARK_COUNT }, (_, index) => ({
    x: 0.4 + (index * 0.0001) % 0.2,
    y: 0.4 + (index * 0.00013) % 0.2,
    z: 0,
  }));
}

function jitter(sampleIndex: number, landmarkIndex: number, axis: number): number {
  const seed = Math.sin(sampleIndex * 12.9898 + landmarkIndex * 78.233 + axis * 37.719) * 43758.5453;
  const noise = seed - Math.floor(seed);
  return (noise - 0.5) * 0.004;
}
