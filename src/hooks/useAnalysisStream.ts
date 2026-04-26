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

export function useAnalysisStream() {
  const [state, setState] = useState<AnalysisStreamState>(initial);

  const start = useCallback(async (body: AnalyzeRequestBody) => {
    setState({ ...initial, isStreaming: true });
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      setState((current) => ({ ...current, isStreaming: false, error: text || "분석 요청 실패" }));
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalReportId: string | null = null;

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
          setState((current) => ({ ...current, reportId: parsed.reportId }));
        } else if (parsed.type === "chunk") {
          setState((current) => ({ ...current, raw: current.raw + parsed.text }));
        } else if (parsed.type === "complete") {
          finalReportId = parsed.reportId;
          setState((current) => ({
            ...current,
            reportId: parsed.reportId,
            sections: parsed.sections,
            isComplete: true,
            isStreaming: false,
          }));
        } else if (parsed.type === "error") {
          setState((current) => ({ ...current, error: parsed.message, isStreaming: false }));
        }
      }
    }

    setState((current) => ({ ...current, isStreaming: false }));
    return finalReportId;
  }, []);

  return { state, start };
}
