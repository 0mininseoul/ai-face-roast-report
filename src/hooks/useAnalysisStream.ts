"use client";

import { useCallback, useState } from "react";
import type { AnalyzeRequestBody, AnalyzeSseEvent, ReportSections } from "@/types/analysis";

export interface AnalysisStreamState {
  reportId: string | null;
  raw: string;
  sections: ReportSections | null;
  error: string | null;
  isStreaming: boolean;
  isComplete: boolean;
}

const initial: AnalysisStreamState = {
  reportId: null,
  raw: "",
  sections: null,
  error: null,
  isStreaming: false,
  isComplete: false,
};

interface AnalysisStreamOptions {
  onEvent?: (eventName: string, payload?: Record<string, unknown>, reportId?: string | null) => void;
}

export function useAnalysisStream(options?: AnalysisStreamOptions) {
  const [state, setState] = useState<AnalysisStreamState>(initial);
  const onEvent = options?.onEvent;

  const start = useCallback(async (body: AnalyzeRequestBody) => {
    setState({ ...initial, isStreaming: true });
    onEvent?.("analysis_fetch_started", { phase: "client_fetch", gender: body.gender });

    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "분석 요청 실패";
      onEvent?.("analysis_fetch_failed", { phase: "client_fetch", message }, null);
      setState((current) => ({ ...current, isStreaming: false, error: message }));
      return null;
    }

    onEvent?.("analysis_response_received", { phase: "client_fetch", status: response.status, ok: response.ok, hasBody: Boolean(response.body) });

    if (!response.ok || !response.body) {
      const text = await response.text();
      onEvent?.("analysis_response_rejected", { phase: "client_fetch", status: response.status, message: text || "분석 요청 실패" });
      setState((current) => ({ ...current, isStreaming: false, error: text || "분석 요청 실패" }));
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalReportId: string | null = null;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event
            .split("\n")
            .find((part) => part.startsWith("data: "))
            ?.slice(6);
          if (!line) continue;
          const parsed = JSON.parse(line) as AnalyzeSseEvent;
          if (parsed.type === "report_id") {
            finalReportId = parsed.reportId;
            onEvent?.("analysis_report_id_received", { phase: "client_stream" }, parsed.reportId);
            setState((current) => ({ ...current, reportId: parsed.reportId }));
          } else if (parsed.type === "chunk") {
            onEvent?.("analysis_stream_chunk_received", { phase: "client_stream", chunkBytes: parsed.text.length }, finalReportId);
            setState((current) => ({ ...current, raw: current.raw + parsed.text }));
          } else if (parsed.type === "complete") {
            finalReportId = parsed.reportId;
            onEvent?.("analysis_stream_complete", { phase: "client_stream" }, parsed.reportId);
            setState((current) => ({
              ...current,
              reportId: parsed.reportId,
              sections: parsed.sections,
              isComplete: true,
              isStreaming: false,
            }));
          } else if (parsed.type === "error") {
            onEvent?.("analysis_stream_error", { phase: "client_stream", message: parsed.message }, finalReportId);
            setState((current) => ({ ...current, error: parsed.message, isStreaming: false }));
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "분석 응답 수신 실패";
      onEvent?.("analysis_stream_read_failed", { phase: "client_stream", message }, finalReportId);
      setState((current) => ({ ...current, isStreaming: false, error: message }));
      return finalReportId;
    }

    setState((current) => ({ ...current, isStreaming: false }));
    return finalReportId;
  }, [onEvent]);

  return { state, start };
}
