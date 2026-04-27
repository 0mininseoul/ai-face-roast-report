export function backfillStoredReportSections(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const report = input as Record<string, unknown>;
  const impression = report.impression;
  if (!impression || typeof impression !== "object" || Array.isArray(impression)) return input;

  const nextImpression = { ...impression } as Record<string, unknown>;
  const estimatedAge = typeof nextImpression.estimatedAge === "number" ? nextImpression.estimatedAge : null;
  const estimatedAgeReal = typeof nextImpression.estimatedAgeReal === "number" ? nextImpression.estimatedAgeReal : estimatedAge;

  if (estimatedAgeReal !== null) {
    nextImpression.estimatedAgeReal = estimatedAgeReal;
  }

  if (nextImpression.ageBucket !== "under_35" && nextImpression.ageBucket !== "over_35" && estimatedAgeReal !== null) {
    nextImpression.ageBucket = estimatedAgeReal < 35 ? "under_35" : "over_35";
  }

  return { ...report, impression: nextImpression };
}
