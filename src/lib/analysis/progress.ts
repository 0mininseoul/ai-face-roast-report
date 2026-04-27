import { TARGET_SAMPLE_COUNT } from "@/lib/analysis/sampling";
import type { FaceReportStatus } from "@/types/analysis";

interface AnalysisProgressInput {
  cameraStatus: string;
  isModelLoading: boolean;
  hasStarted: boolean;
  sampleCount: number;
  rawChars: number;
  hasReportId: boolean;
  jobStatus?: FaceReportStatus | null;
  pollCount?: number;
  isComplete: boolean;
}

export interface AnalysisProgress {
  percent: number;
  label: string;
}

const ESTIMATED_REPORT_CHARS = 5200;
export function getAnalysisProgress(input: AnalysisProgressInput): AnalysisProgress {
  if (input.cameraStatus !== "ready") {
    return { percent: 8, label: "카메라 초기화" };
  }

  if (input.isModelLoading) {
    return { percent: 18, label: "얼굴 인식 모델 로딩" };
  }

  if (!input.hasStarted) {
    const sampleRatio = clamp(input.sampleCount / TARGET_SAMPLE_COUNT, 0, 1);
    return { percent: Math.round(22 + sampleRatio * 28), label: "얼굴 안정 프레임 수집" };
  }

  if (!input.hasReportId) {
    return { percent: 54, label: "분석 요청 전송" };
  }

  if (!input.isComplete) {
    if (input.jobStatus === "queued") {
      return { percent: 60, label: "정밀 분석 대기" };
    }

    if (input.jobStatus === "retrying") {
      return { percent: 66, label: "Pro 분석 재시도 대기" };
    }

    if (input.jobStatus === "processing" || input.jobStatus === "analyzing") {
      const pollProgress = clamp((input.pollCount ?? 0) / 12, 0, 1);
      return { percent: Math.round(68 + pollProgress * 24), label: "AI 정밀 분석 진행" };
    }

    const streamRatio = clamp(input.rawChars / ESTIMATED_REPORT_CHARS, 0, 1);
    return { percent: Math.round(58 + streamRatio * 34), label: "AI 분석 응답 수신" };
  }

  return { percent: 100, label: "최종 결론 확인" };
}

export function formatProgress(progress: AnalysisProgress): string {
  return `${progress.percent}% ${progress.label}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
