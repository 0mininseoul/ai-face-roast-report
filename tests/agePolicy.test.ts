import { describe, expect, it } from "vitest";
import { applyBalancedAgePolicy } from "@/lib/analysis/agePolicy";
import type { ReportSections } from "@/types/analysis";

const baseSections: ReportSections = {
  meta: { reportId: "r1", confidence: 90, complianceText: "ok" },
  geometry: { asymmetry: "a", phi: "p", thirds: "t", fifths: "f", faceAspect: "fa" },
  parts: {
    forehead: { metricsText: "m", comment: "c" },
    eyes: { metricsText: "m", comment: "c" },
    nose: { metricsText: "m", comment: "c" },
    mouth: { metricsText: "m", comment: "c" },
    jaw: { metricsText: "m", comment: "c" },
    skin: { observation: "o", comment: "c" },
  },
  scores: {
    likability: 50,
    trust: 50,
    symmetry: 50,
    balance: 50,
    attractiveness: 50,
    comments: ["a", "b", "c", "d", "e"],
  },
  impression: {
    keywords: ["a", "b", "c"],
    estimatedAge: 37,
    estimatedAgeReal: 32,
    ageBucket: "over_35",
    physiognomy: "p",
  },
  conclusion: "c",
  mainCopy: "m",
};

describe("applyBalancedAgePolicy", () => {
  it("uses the real estimated age as the displayed age in balanced mode", () => {
    const next = applyBalancedAgePolicy(baseSections);

    expect(next.impression.estimatedAge).toBe(32);
    expect(next.impression.estimatedAgeReal).toBe(32);
    expect(next.impression.ageBucket).toBe("under_35");
  });

  it("keeps displayed-age bucket aligned with rounded age", () => {
    const next = applyBalancedAgePolicy({
      ...baseSections,
      impression: { ...baseSections.impression, estimatedAge: 30, estimatedAgeReal: 34.6, ageBucket: "under_35" },
    });

    expect(next.impression.estimatedAge).toBe(35);
    expect(next.impression.ageBucket).toBe("over_35");
  });
});
