import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { analysisStatusMessage, isPendingAnalysisStatus, processAnalysisJob, shouldWakeAnalysisJob } from "@/lib/analysis/jobRunner";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import { reportSectionsSchema, type AnalyzeStatusResponse, type FaceReportRow } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const reportId = req.nextUrl.searchParams.get("id");
  if (!reportId || !isUuid(reportId)) {
    return Response.json({ error: "invalid_report_id" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", reportId).single();
  if (error || !data) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const row = data as FaceReportRow;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return Response.json({ error: "expired" }, { status: 410 });
  }

  if (isPendingAnalysisStatus(row.status) && shouldWakeAnalysisJob(row)) {
    waitUntil(
      processAnalysisJob(row.id).catch((wakeError) =>
        logServiceEvent({
          req,
          reportId: row.id,
          eventName: "analysis_status_wake_failed",
          phase: "server_status",
          level: "error",
          payload: { message: analysisErrorMessage(wakeError), providerMessage: extractErrorText(wakeError) },
        }),
      ),
    );
  }

  if (row.status === "complete") {
    if (!row.report_sections_json) {
      return Response.json(
        {
          reportId: row.id,
          status: "failed",
          message: "완료된 보고서 데이터가 비어 있습니다.",
          retryAfter: null,
          attemptCount: row.attempt_count ?? 0,
          modelUsed: row.model_used ?? null,
        } satisfies AnalyzeStatusResponse,
        { status: 500 },
      );
    }

    return Response.json({
      reportId: row.id,
      status: "complete",
      message: analysisStatusMessage(row),
      sections: reportSectionsSchema.parse(row.report_sections_json),
      modelUsed: row.model_used ?? null,
    } satisfies AnalyzeStatusResponse);
  }

  if (row.status === "failed") {
    return Response.json({
      reportId: row.id,
      status: "failed",
      message: analysisStatusMessage(row),
      retryAfter: row.retry_after ?? null,
      attemptCount: row.attempt_count ?? 0,
      modelUsed: row.model_used ?? null,
    } satisfies AnalyzeStatusResponse);
  }

  return Response.json({
    reportId: row.id,
    status: row.status,
    message: analysisStatusMessage(row),
    retryAfter: row.retry_after ?? null,
    attemptCount: row.attempt_count ?? 0,
    modelUsed: row.model_used ?? null,
  } satisfies AnalyzeStatusResponse);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
