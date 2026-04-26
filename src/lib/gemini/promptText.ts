import type { FaceMetrics, Gender } from "@/types/analysis";

export function buildAnalyzeUserPrompt(gender: Gender, metrics: FaceMetrics, reportId: string): string {
  return [
    `gender: ${gender}`,
    `report_id: ${reportId}`,
    "metrics_json:",
    JSON.stringify(metrics, null, 2),
    "",
    "위 메트릭과 첨부 이미지를 기반으로 JSON 보고서를 생성하세요.",
  ].join("\n");
}
