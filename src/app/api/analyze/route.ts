import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { drainAnalysisQueue } from "@/lib/analysis/jobRunner";
import { MIN_LANDMARK_VARIANCE } from "@/lib/analysis/liveness";
import { checkDailyQuota, recordQuotaUsage } from "@/lib/analysis/quota";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LOCALE_HEADER, isLocale, normalizeLocale } from "@/lib/i18n/locales";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { AnalysisTone, AnalyzeRequestBody, AnalyzeStartResponse } from "@/types/analysis";

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

  const analysisTone = body.analysisTone === undefined ? "roast" : parseAnalysisTone(body.analysisTone);
  const locale = body.locale === undefined ? normalizeLocale(req.headers.get(LOCALE_HEADER)) : parseLocale(body.locale);
  if (!analysisTone) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_invalid_tone",
      phase: "server_request",
      level: "warn",
      payload: { analysisTone: body.analysisTone },
    });
    return Response.json({ error: "invalid_analysis_tone" }, { status: 400 });
  }
  if (!locale) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_invalid_locale",
      phase: "server_request",
      level: "warn",
      payload: { locale: body.locale },
    });
    return Response.json({ error: "invalid_locale" }, { status: 400 });
  }

  const deviceId = sanitizeDeviceId(body.deviceId);
  const liveness = body.liveness ?? null;
  const livenessVariance = typeof liveness?.variance === "number" && Number.isFinite(liveness.variance) ? liveness.variance : null;

  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    eventName: "analysis_request_received",
    phase: "server_request",
    payload: {
      gender: body.gender,
      analysisTone,
      locale,
      captureBytesApprox: Math.round(stripDataUrl(body.imageBase64).length * 0.75),
      deviceId,
      livenessVariance,
      livenessSampleCount: liveness?.sampleCount ?? null,
    },
  });

  const supabase = getServerSupabase();
  const hashedIp = await ipHash(ip);
  const userAgent = req.headers.get("user-agent") ?? "";

  if (livenessVariance === null || livenessVariance < MIN_LANDMARK_VARIANCE) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_liveness_rejected",
      phase: "server_request",
      level: "warn",
      payload: { livenessVariance, threshold: MIN_LANDMARK_VARIANCE, deviceId, hasLiveness: Boolean(liveness) },
    });
    return Response.json({ error: "live_capture_required" }, { status: 422 });
  }

  const quota = await checkDailyQuota(hashedIp, deviceId);
  if (!quota.ok) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      eventName: "analysis_daily_quota_exceeded",
      phase: "server_request",
      level: "warn",
      payload: { count: quota.count, limit: quota.limit, windowHours: quota.windowHours, matchedBy: quota.matchedBy, deviceId },
    });
    return Response.json(
      { error: "daily_limit_reached", limit: quota.limit, windowHours: quota.windowHours },
      { status: 429 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("face_reports")
    .insert({
      gender: body.gender,
      analysis_tone: analysisTone,
      locale,
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
    payload: { gender: body.gender, analysisTone, locale },
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

  await recordQuotaUsage({ ipHash: hashedIp, deviceId, reportId });

  waitUntil(
    drainAnalysisQueue({ targetId: reportId, sessionId: body.clientSessionId }).catch((error) =>
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
    message: getDictionary(locale).status.queued,
  };
  return Response.json(response, { status: 202 });
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function parseAnalysisTone(value: unknown): AnalysisTone | null {
  return value === "roast" || value === "balanced" ? value : null;
}

function parseLocale(value: unknown) {
  return isLocale(value) ? value : null;
}

function sanitizeDeviceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}
