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

  it("emits a forehead classification alongside areaPct", () => {
    const metrics = computeFaceMetrics(fakeLandmarks());
    expect(metrics.forehead.classification).toMatch(/^(narrow|average|wide)$/);
  });
});

describe("forehead classification thresholds", () => {
  function landmarksWithUpperThird(upperThird: number): Landmark[] {
    // box.y = 0, box.height = 1 → upperThird = brow.y
    // Build a 478-landmark array where browLeft (105) sits at upperThird,
    // forehead (10) is at the top, and chin (152) is at the bottom.
    const base: Landmark[] = Array.from({ length: 478 }, (_, index) => ({
      x: 0.5 + (index % 7) * 0.01,
      y: 0.5,
      z: 0,
    }));
    base[10] = { x: 0.5, y: 0, z: 0 };
    base[152] = { x: 0.5, y: 1, z: 0 };
    base[234] = { x: 0, y: 0.5, z: 0 };
    base[454] = { x: 1, y: 0.5, z: 0 };
    base[33] = { x: 0.3, y: 0.4, z: 0 };
    base[263] = { x: 0.7, y: 0.4, z: 0 };
    base[105] = { x: 0.45, y: upperThird, z: 0 };
    base[334] = { x: 0.55, y: upperThird, z: 0 };
    base[2] = { x: 0.5, y: upperThird + 0.15, z: 0 };
    return base;
  }

  it("flags forehead < 14% as narrow", () => {
    expect(computeFaceMetrics(landmarksWithUpperThird(0.12)).forehead.classification).toBe("narrow");
  });

  it("flags 14%~18% as average", () => {
    expect(computeFaceMetrics(landmarksWithUpperThird(0.16)).forehead.classification).toBe("average");
  });

  it("flags forehead > 18% as wide", () => {
    expect(computeFaceMetrics(landmarksWithUpperThird(0.22)).forehead.classification).toBe("wide");
  });
});
