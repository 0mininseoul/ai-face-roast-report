import type { AnalysisSource } from "@/types/analysis";

export function shouldRejectImageSourceForAnalysis(imageSource: string | null, analysisSource: AnalysisSource | null | undefined): boolean {
  return analysisSource !== "manual_upload" && Boolean(imageSource && imageSource !== "real_webcam");
}
