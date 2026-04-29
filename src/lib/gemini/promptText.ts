import type { AnalysisSource, AnalysisTone, FaceMetrics, Gender } from "@/types/analysis";

export function buildAnalyzeUserPrompt(
  gender: Gender,
  metrics: FaceMetrics,
  reportId: string,
  options?: { analysisSource?: AnalysisSource; analysisTone?: AnalysisTone; manualDetectedFaceCount?: number | null },
): string {
  const lines = [
    `gender: ${gender}`,
    `report_id: ${reportId}`,
  ];

  if (options?.analysisSource) lines.push(`analysis_source: ${options.analysisSource}`);
  if (options?.analysisTone) lines.push(`analysis_tone: ${options.analysisTone}`);
  if (typeof options?.manualDetectedFaceCount === "number") lines.push(`manual_detected_face_count: ${options.manualDetectedFaceCount}`);

  lines.push("metrics_json:", JSON.stringify(metrics, null, 2), "", "위 메트릭과 첨부 이미지를 기반으로 JSON 보고서를 생성하세요.");
  return lines.join("\n");
}
