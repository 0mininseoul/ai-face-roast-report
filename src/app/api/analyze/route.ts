import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { processAnalysisJob } from "@/lib/analysis/jobRunner";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { AnalyzeRequestBody, AnalyzeStartResponse } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`analyze:${ip}`);
  if (!limit.ok) {
    await logServiceEvent({
      req,
      eventName: "analysis_rate_limited",
      phase: "server_request",
      level: "warn",
      payload: { retryAfterSec: limit.retryAfterSec },
    });
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfterSec }, { status: 429 });
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    await logServiceEvent({ req, eventName: "analysis_invalid_json", phase: "server_request", level: "warn" });
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.gender || !body.metrics || !body.imageBase64) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_missing_required_fields",
      phase: "server_request",
      level: "warn",
      payload: { hasGender: Boolean(body.gender), hasMetrics: Boolean(body.metrics), hasImage: Boolean(body.imageBase64) },
    });
    return new Response("Missing required fields", { status: 400 });
  }

  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    eventName: "analysis_request_received",
    phase: "server_request",
    payload: {
      gender: body.gender,
      captureBytesApprox: Math.round(stripDataUrl(body.imageBase64).length * 0.75),
    },
  });

  const supabase = getServerSupabase();
  const hashedIp = await ipHash(ip);
  const userAgent = req.headers.get("user-agent") ?? "";

  const { data: inserted, error: insertError } = await supabase
    .from("face_reports")
    .insert({
      gender: body.gender,
      status: "queued",
      metrics_json: body.metrics,
      landmarks_json: body.landmarks ?? null,
      user_agent: userAgent,
      ip_hash: hashedIp,
      attempt_count: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_report_create_failed",
      phase: "server_storage",
      level: "error",
      payload: { message: insertError?.message ?? "missing inserted id" },
    });
    return new Response("Failed to create report", { status: 500 });
  }

  const reportId = String(inserted.id);
  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    reportId,
    eventName: "analysis_report_created",
    phase: "server_storage",
    payload: { gender: body.gender },
  });

  const cleanBase64 = stripDataUrl(body.imageBase64);
  const imageBuffer = Buffer.from(cleanBase64, "base64");
  const facePath = `${reportId}/capture.jpg`;

  const { error: uploadError } = await supabase.storage.from("face-images").upload(facePath, imageBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (uploadError) {
    await supabase.from("face_reports").update({ status: "failed", last_error: uploadError.message }).eq("id", reportId);
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId,
      eventName: "analysis_image_upload_failed",
      phase: "server_storage",
      level: "error",
      payload: { message: uploadError.message },
    });
    return new Response("Failed to store face image", { status: 500 });
  }

  const { error: updateError } = await supabase.from("face_reports").update({ face_image_path: facePath }).eq("id", reportId);
  if (updateError) {
    await supabase.from("face_reports").update({ status: "failed", last_error: updateError.message }).eq("id", reportId);
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId,
      eventName: "analysis_report_update_failed",
      phase: "server_storage",
      level: "error",
      payload: { message: updateError.message },
    });
    return new Response("Failed to queue report", { status: 500 });
  }

  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    reportId,
    eventName: "analysis_image_uploaded",
    phase: "server_storage",
    payload: { bytes: imageBuffer.length },
  });

  waitUntil(
    processAnalysisJob(reportId, { sessionId: body.clientSessionId }).catch((error) =>
      logServiceEvent({
        sessionId: body.clientSessionId,
        reportId,
        eventName: "analysis_background_start_failed",
        phase: "server_worker",
        level: "error",
        payload: { message: analysisErrorMessage(error), providerMessage: extractErrorText(error) },
      }),
    ),
  );

  const response: AnalyzeStartResponse = {
    reportId,
    status: "queued",
    message: "정밀 분석 대기열에 등록했습니다.",
  };
  return Response.json(response, { status: 202 });
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}
