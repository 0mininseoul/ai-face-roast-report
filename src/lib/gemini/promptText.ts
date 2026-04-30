import type { AnalysisSource, AnalysisTone, FaceMetrics, Gender } from "@/types/analysis";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export function buildAnalyzeUserPrompt(
  gender: Gender,
  metrics: FaceMetrics,
  reportId: string,
  options?: { analysisSource?: AnalysisSource; analysisTone?: AnalysisTone; manualDetectedFaceCount?: number | null; locale?: Locale },
): string {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const lines = [
    `gender: ${gender}`,
    `report_id: ${reportId}`,
    `locale: ${locale}`,
    `target_language: ${targetLanguageName(locale)}`,
  ];

  if (options?.analysisSource) lines.push(`analysis_source: ${options.analysisSource}`);
  if (options?.analysisTone) lines.push(`analysis_tone: ${options.analysisTone}`);
  if (typeof options?.manualDetectedFaceCount === "number") lines.push(`manual_detected_face_count: ${options.manualDetectedFaceCount}`);

  lines.push("metrics_json:", JSON.stringify(metrics, null, 2), "", userPromptInstruction(locale));
  return lines.join("\n");
}

function targetLanguageName(locale: Locale): string {
  if (locale === "en") return "English";
  if (locale === "ja") return "Japanese";
  return "Korean";
}

function userPromptInstruction(locale: Locale): string {
  if (locale === "en") return "Generate a JSON report in English based on the metrics above and the attached image.";
  if (locale === "ja") return "上記のメトリックと添付画像に基づいて、日本語のJSONレポートを生成してください。";
  return "위 메트릭과 첨부 이미지를 기반으로 JSON 보고서를 생성하세요.";
}
