import { describe, expect, it } from "vitest";
import { computeFaceMetrics, computeFaceBox } from "@/lib/facemesh/metricsCalculator";
import type { Landmark } from "@/types/analysis";

function fakeLandmarks(): Landmark[] {
  return Array.from({ length: 478 }, (_, index) => ({
    x: 0.25 + (index % 20) * 0.025,
    y: 0.18 + Math.floor(index / 20) * 0.025,
    z: 0,
  }));
}

describe("computeFaceBox", () => {
  it("returns normalized bounds", () => {
    const box = computeFaceBox([
      { x: 0.2, y: 0.3, z: 0 },
      { x: 0.7, y: 0.9, z: 0 },
    ]);
    expect(box).toEqual({ x: 0.2, y: 0.3, width: 0.5, height: 0.6 });
  });
});

describe("computeFaceMetrics", () => {
  it("computes stable metrics from MediaPipe landmarks", () => {
    const metrics = computeFaceMetrics(fakeLandmarks());
    expect(metrics.asymmetryIndex).toBeGreaterThanOrEqual(0);
    expect(metrics.phiRatioCompliance).toBeGreaterThanOrEqual(0);
    expect(metrics.fifths).toHaveLength(5);
    expect(metrics.faceBox.width).toBeGreaterThan(0);
  });
});
