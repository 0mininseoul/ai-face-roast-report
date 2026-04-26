import { TARGET_SAMPLE_COUNT } from "@/lib/analysis/sampling";

interface AnalysisProgressInput {
  cameraStatus: string;
  isModelLoading: boolean;
  hasStarted: boolean;
  sampleCount: number;
  rawChars: number;
  hasReportId: boolean;
  isComplete: boolean;
  liveCommentCount: number;
}

export interface AnalysisProgress {
  percent: number;
  label: string;
}

const ESTIMATED_REPORT_CHARS = 5200;
const TARGET_LIVE_COMMENT_COUNT = 5;

export function getAnalysisProgress(input: AnalysisProgressInput): AnalysisProgress {
  if (input.cameraStatus !== "ready") {
    return { percent: 8, label: "카메라 초기화" };
  }

  if (input.isModelLoading) {
    return { percent: 18, label: "MediaPipe 모델 로딩" };
  }

  if (!input.hasStarted) {
    const sampleRatio = clamp(input.sampleCount / TARGET_SAMPLE_COUNT, 0, 1);
    return { percent: Math.round(22 + sampleRatio * 28), label: "얼굴 안정 프레임 수집" };
  }

  if (!input.hasReportId) {
    return { percent: 54, label: "분석 요청 전송" };
  }

  if (!input.isComplete) {
    const streamRatio = clamp(input.rawChars / ESTIMATED_REPORT_CHARS, 0, 1);
    return { percent: Math.round(58 + streamRatio * 30), label: "Gemini 분석 응답 수신" };
  }

  if (input.liveCommentCount < TARGET_LIVE_COMMENT_COUNT) {
    const commentRatio = clamp(input.liveCommentCount / TARGET_LIVE_COMMENT_COUNT, 0, 1);
    return { percent: Math.round(90 + commentRatio * 8), label: "실시간 코멘트 생성" };
  }

  return { percent: 100, label: "결과 페이지 이동" };
}

export function formatProgress(progress: AnalysisProgress): string {
  return `${progress.percent}% ${progress.label}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
