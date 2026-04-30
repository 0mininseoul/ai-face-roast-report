import "server-only";

import { waitUntil } from "@vercel/functions";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { drainAnalysisQueue, shouldWakeAnalysisJob } from "@/lib/analysis/jobRunner";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { FaceReportRow } from "@/types/analysis";

export function wakeAnalysisJobIfReady({
  row,
  eventName,
  phase,
}: {
  row: FaceReportRow;
  eventName: string;
  phase: string;
}): boolean {
  if (!shouldWakeAnalysisJob(row)) return false;

  waitUntil(
    drainAnalysisQueue({ targetId: row.id }).catch((wakeError) =>
      logServiceEvent({
        reportId: row.id,
        eventName,
        phase,
        level: "error",
        payload: { message: analysisErrorMessage(wakeError), providerMessage: extractErrorText(wakeError) },
      }),
    ),
  );
  return true;
}
