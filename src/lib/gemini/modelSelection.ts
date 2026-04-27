export function buildAnalysisModelChain({
  primaryModel,
  fallbackModel,
  fastModel,
}: {
  primaryModel: string;
  fallbackModel?: string;
  fastModel: string;
}): string[] {
  const ordered = [primaryModel, fallbackModel, fastModel].map((model) => model?.trim()).filter(Boolean) as string[];
  return Array.from(new Set(ordered));
}
