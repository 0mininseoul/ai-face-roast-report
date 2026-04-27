"use client";

import { useCallback, useRef, useState } from "react";
import { analysisErrorMessage } from "@/lib/analysis/errors";
import type { AnalyzeRequestBody, AnalyzeStartResponse, AnalyzeStatusResponse, FaceReportStatus, ReportSections } from "@/types/analysis";

export interface AnalysisStreamState {
  reportId: string | null;
  raw: string;
  sections: ReportSections | null;
  error: string | null;
  statusMessage: string | null;
  jobStatus: FaceReportStatus | null;
  attemptCount: number;
  modelUsed: string | null;
  pollCount: number;
  isStreaming: boolean;
  isComplete: boolean;
}

const initial: AnalysisStreamState = {
  reportId: null,
  raw: "",
  sections: null,
  error: null,
  statusMessage: null,
  jobStatus: null,
  attemptCount: 0,
  modelUsed: null,
  pollCount: 0,
  isStreaming: false,
  isComplete: false,
};

interface AnalysisStreamOptions {
  onEvent?: (eventName: string, payload?: Record<string, unknown>, reportId?: string | null) => void;
}

const STATUS_POLL_INTERVAL_MS = 2_500;
const MAX_STATUS_POLL_MS = 10 * 60_000;
const SYNTHETIC_REPORT_CHARS = 5200;

export function useAnalysisStream(options?: AnalysisStreamOptions) {
  const [state, setState] = useState<AnalysisStreamState>(initial);
  const runIdRef = useRef(0);
  const onEvent = options?.onEvent;

  const start = useCallback(async (body: AnalyzeRequestBody) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const updateState = (updater: (current: AnalysisStreamState) => AnalysisStreamState) => {
      setState((current) => (runIdRef.current === runId ? updater(current) : current));
    };

    setState({ ...initial, isStreaming: true, statusMessage: "정밀 분석 요청을 전송하고 있습니다." });
    onEvent?.("analysis_fetch_started", { phase: "client_fetch", gender: body.gender });

    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const message = analysisErrorMessage(error);
      onEvent?.("analysis_fetch_failed", { phase: "client_fetch", message }, null);
      updateState((current) => ({ ...current, isStreaming: false, error: message }));
      return null;
    }

    onEvent?.("analysis_response_received", { phase: "client_fetch", status: response.status, ok: response.ok });

    if (!response.ok) {
      const text = await response.text();
      const message = analysisErrorMessage(text || response.status);
      onEvent?.("analysis_response_rejected", { phase: "client_fetch", status: response.status, message });
      updateState((current) => ({ ...current, isStreaming: false, statusMessage: null, error: message }));
      return null;
    }

    let queued: AnalyzeStartResponse;
    try {
      queued = (await response.json()) as AnalyzeStartResponse;
    } catch (error) {
      const message = analysisErrorMessage(error);
      onEvent?.("analysis_response_parse_failed", { phase: "client_fetch", message });
      updateState((current) => ({ ...current, isStreaming: false, statusMessage: null, error: message }));
      return null;
    }

    onEvent?.("analysis_report_id_received", { phase: "client_poll", status: queued.status }, queued.reportId);
    updateState((current) => ({
      ...current,
      reportId: queued.reportId,
      jobStatus: queued.status,
      statusMessage: queued.message,
      raw: syntheticRaw(1),
      pollCount: 0,
    }));

    const finalReportId = queued.reportId;
    const startedAt = Date.now();
    let pollCount = 0;

    while (Date.now() - startedAt < MAX_STATUS_POLL_MS) {
      await delay(STATUS_POLL_INTERVAL_MS);
      if (runIdRef.current !== runId) return finalReportId;
      pollCount += 1;

      let statusResponse: Response;
      try {
        statusResponse = await fetch(`/api/analyze/status?id=${encodeURIComponent(finalReportId)}`, { cache: "no-store" });
      } catch (error) {
        const message = analysisErrorMessage(error);
        onEvent?.("analysis_status_fetch_failed", { phase: "client_poll", message, pollCount }, finalReportId);
        updateState((current) => ({ ...current, statusMessage: message, pollCount }));
        continue;
      }

      if (!statusResponse.ok) {
        const text = await statusResponse.text();
        const message = analysisErrorMessage(text || statusResponse.status);
        onEvent?.("analysis_status_rejected", { phase: "client_poll", status: statusResponse.status, message, pollCount }, finalReportId);
        updateState((current) => ({ ...current, isStreaming: false, statusMessage: null, error: message, pollCount }));
        return finalReportId;
      }

      const status = (await statusResponse.json()) as AnalyzeStatusResponse;
      onEvent?.(
        "analysis_status_received",
        {
          phase: "client_poll",
          status: status.status,
          message: status.message,
          attemptCount: "attemptCount" in status ? status.attemptCount : undefined,
          modelUsed: status.modelUsed,
          pollCount,
        },
        finalReportId,
      );

      if (status.status === "complete") {
        onEvent?.("analysis_stream_complete", { phase: "client_poll", modelUsed: status.modelUsed, pollCount }, status.reportId);
        updateState((current) => ({
          ...current,
          reportId: status.reportId,
          sections: status.sections,
          raw: syntheticRaw(SYNTHETIC_REPORT_CHARS),
          statusMessage: status.message,
          jobStatus: status.status,
          modelUsed: status.modelUsed,
          pollCount,
          isComplete: true,
          isStreaming: false,
        }));
        return status.reportId;
      }

      if (status.status === "failed") {
        const message = status.message;
        onEvent?.("analysis_stream_error", { phase: "client_poll", message, pollCount, modelUsed: status.modelUsed }, status.reportId);
        updateState((current) => ({
          ...current,
          reportId: status.reportId,
          error: message,
          statusMessage: null,
          jobStatus: status.status,
          attemptCount: status.attemptCount,
          modelUsed: status.modelUsed,
          pollCount,
          isStreaming: false,
        }));
        return status.reportId;
      }

      updateState((current) => ({
        ...current,
        reportId: status.reportId,
        statusMessage: status.message,
        jobStatus: status.status,
        attemptCount: status.attemptCount,
        modelUsed: status.modelUsed,
        pollCount,
        raw: syntheticRaw(Math.min(SYNTHETIC_REPORT_CHARS - 1, 400 + pollCount * 360)),
      }));
    }

    const message = "분석 대기 시간이 길어지고 있습니다. 결과 링크에서 잠시 후 다시 확인해 주세요.";
    onEvent?.("analysis_status_poll_timeout", { phase: "client_poll", message }, finalReportId);
    updateState((current) => ({ ...current, isStreaming: false, statusMessage: message, error: message }));
    return finalReportId;
  }, [onEvent]);

  return { state, start };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function syntheticRaw(chars: number): string {
  return ".".repeat(Math.max(0, Math.min(chars, SYNTHETIC_REPORT_CHARS)));
}
