import type { AgeBucket, ReportSections } from "@/types/analysis";

export function ageBucketFromDisplayedAge(age: number): AgeBucket {
  return Math.round(age) < 35 ? "under_35" : "over_35";
}

export function applyBalancedAgePolicy(sections: ReportSections): ReportSections {
  const realAge = normalizedAge(sections.impression.estimatedAgeReal);
  if (realAge === null) return sections;

  const displayedAge = Math.round(realAge);
  return {
    ...sections,
    impression: {
      ...sections.impression,
      estimatedAge: displayedAge,
      estimatedAgeReal: realAge,
      ageBucket: ageBucketFromDisplayedAge(displayedAge),
    },
  };
}

function normalizedAge(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return value > 0 ? value : null;
}
