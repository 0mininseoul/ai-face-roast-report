export function buildAnalysisModelChain({
  primaryModel,
  fastModel,
}: {
  primaryModel: string;
  fastModel: string;
}): string[] {
  const ordered = [fastModel, primaryModel].map((model) => model.trim()).filter(Boolean);
  return Array.from(new Set(ordered));
}
