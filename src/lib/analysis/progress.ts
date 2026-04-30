import { TARGET_SAMPLE_COUNT } from "@/lib/analysis/sampling";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
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
export function getAnalysisProgress(input: AnalysisProgressInput, locale: Locale = DEFAULT_LOCALE): AnalysisProgress {
  const labels = getDictionary(locale).progress;
  if (input.cameraStatus !== "ready") {
    return { percent: 8, label: labels.cameraInit };
  }

  if (input.isModelLoading) {
    return { percent: 18, label: labels.modelLoading };
  }

  if (!input.hasStarted) {
    const sampleRatio = clamp(input.sampleCount / TARGET_SAMPLE_COUNT, 0, 1);
    return { percent: Math.round(22 + sampleRatio * 28), label: labels.collecting };
  }

  if (!input.hasReportId) {
    return { percent: 54, label: labels.sending };
  }

  if (!input.isComplete) {
    if (input.jobStatus === "queued") {
      return { percent: 60, label: labels.queued };
    }

    if (input.jobStatus === "retrying") {
      return { percent: 66, label: labels.retrying };
    }

    if (input.jobStatus === "processing" || input.jobStatus === "analyzing") {
      const pollProgress = clamp((input.pollCount ?? 0) / 12, 0, 1);
      return { percent: Math.round(68 + pollProgress * 24), label: labels.processing };
    }

    const streamRatio = clamp(input.rawChars / ESTIMATED_REPORT_CHARS, 0, 1);
    return { percent: Math.round(58 + streamRatio * 34), label: labels.receiving };
  }

  return { percent: 100, label: labels.receiving };
}

export function formatProgress(progress: AnalysisProgress): string {
  return `${progress.percent}% ${progress.label}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
