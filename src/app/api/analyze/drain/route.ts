import { NextRequest } from "next/server";
import { drainAnalysisQueue } from "@/lib/analysis/jobRunner";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { logServiceEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetId = req.nextUrl.searchParams.get("id");
  if (targetId && !UUID_RE.test(targetId)) {
    return Response.json({ error: "invalid_report_id" }, { status: 400 });
  }

  try {
    const result = await drainAnalysisQueue({ targetId });
    return Response.json(result);
  } catch (error) {
    await logServiceEvent({
      req,
      reportId: targetId,
      eventName: "analysis_drain_failed",
      phase: "server_worker",
      level: "error",
      payload: { message: analysisErrorMessage(error), providerMessage: extractErrorText(error) },
    });
    return Response.json({ error: "drain_failed", message: analysisErrorMessage(error) }, { status: 500 });
  }
}

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
