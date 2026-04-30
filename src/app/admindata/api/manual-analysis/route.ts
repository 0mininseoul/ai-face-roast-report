import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";
import { analysisErrorMessage, extractErrorText } from "@/lib/analysis/errors";
import { drainAnalysisQueue } from "@/lib/analysis/jobRunner";
import { validateAdminBasicAuth } from "@/lib/admin/basicAuth";
import { isLocale, localizedResultPath, normalizeLocale } from "@/lib/i18n/locales";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { AnalysisTone, FaceMetrics, Gender, Landmark } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_IMAGE_BYTES = 2_500_000;
const MAX_ADMIN_NOTE_CHARS = 500;

interface ManualAnalysisRequestBody {
  gender?: unknown;
  analysisTone?: unknown;
  locale?: unknown;
  imageBase64?: unknown;
  metrics?: unknown;
  landmarks?: unknown;
  manualDetectedFaceCount?: unknown;
  adminNote?: unknown;
}

export async function POST(req: NextRequest) {
  const auth = validateAdminBasicAuth(req.headers.get("authorization"));
  if (!auth.configured) return new Response("Admin auth is not configured", { status: 503 });
  if (!auth.ok) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="faceroast-admin", charset="UTF-8"' },
    });
  }

  let body: ManualAnalysisRequestBody;
  try {
    body = (await req.json()) as ManualAnalysisRequestBody;
  } catch {
    await logServiceEvent({ req, eventName: "manual_analysis_invalid_json", phase: "admin_manual_request", level: "warn" });
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const gender = parseGender(body.gender);
  const analysisTone = body.analysisTone === undefined ? "roast" : parseAnalysisTone(body.analysisTone);
  const locale = body.locale === undefined ? "ko" : parseLocale(body.locale);
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const metrics = isObject(body.metrics) ? (body.metrics as unknown as FaceMetrics) : null;
  const landmarks = parseLandmarks(body.landmarks);
  const manualDetectedFaceCount = parseDetectedFaceCount(body.manualDetectedFaceCount);
  const adminNote = parseAdminNote(body.adminNote);

  if (!gender || !analysisTone || !locale || !imageBase64 || !metrics || !landmarks || manualDetectedFaceCount === null) {
    await logServiceEvent({
      req,
      eventName: "manual_analysis_missing_required_fields",
      phase: "admin_manual_request",
      level: "warn",
      payload: {
        hasGender: Boolean(gender),
        hasAnalysisTone: Boolean(analysisTone),
        hasLocale: Boolean(locale),
        hasImage: Boolean(imageBase64),
        hasMetrics: Boolean(metrics),
        hasLandmarks: Boolean(landmarks),
        hasFaceCount: manualDetectedFaceCount !== null,
      },
    });
    return Response.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const cleanBase64 = stripDataUrl(imageBase64);
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(cleanBase64, "base64");
  } catch {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  if (imageBuffer.length <= 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
    await logServiceEvent({
      req,
      eventName: "manual_analysis_image_rejected",
      phase: "admin_manual_request",
      level: "warn",
      payload: { bytes: imageBuffer.length, limit: MAX_IMAGE_BYTES },
    });
    return Response.json({ error: "image_too_large", limitBytes: MAX_IMAGE_BYTES }, { status: 413 });
  }

  const supabase = getServerSupabase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const userAgent = req.headers.get("user-agent") ?? "";
  const { data: inserted, error: insertError } = await supabase
    .from("face_reports")
    .insert({
      gender,
      status: "queued",
      expires_at: expiresAt,
      metrics_json: metrics,
      landmarks_json: landmarks,
      user_agent: userAgent,
      attempt_count: 0,
      analysis_source: "manual_upload",
      analysis_tone: analysisTone,
      locale,
      admin_note: adminNote,
      manual_detected_face_count: manualDetectedFaceCount,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    await logServiceEvent({
      req,
      eventName: "manual_analysis_report_create_failed",
      phase: "admin_manual_storage",
      level: "error",
      payload: { message: insertError?.message ?? "missing inserted id" },
    });
    return Response.json({ error: "failed_to_create_report" }, { status: 500 });
  }

  const reportId = String(inserted.id);
  const facePath = `${reportId}/manual-upload.jpg`;
  const { error: uploadError } = await supabase.storage.from("face-images").upload(facePath, imageBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (uploadError) {
    await supabase.from("face_reports").update({ status: "failed", last_error: uploadError.message }).eq("id", reportId);
    await logServiceEvent({
      req,
      reportId,
      eventName: "manual_analysis_image_upload_failed",
      phase: "admin_manual_storage",
      level: "error",
      payload: { message: uploadError.message },
    });
    return Response.json({ error: "failed_to_store_image" }, { status: 500 });
  }

  const { error: updateError } = await supabase.from("face_reports").update({ face_image_path: facePath }).eq("id", reportId);
  if (updateError) {
    await supabase.from("face_reports").update({ status: "failed", last_error: updateError.message }).eq("id", reportId);
    await logServiceEvent({
      req,
      reportId,
      eventName: "manual_analysis_report_update_failed",
      phase: "admin_manual_storage",
      level: "error",
      payload: { message: updateError.message },
    });
    return Response.json({ error: "failed_to_queue_report" }, { status: 500 });
  }

  await logServiceEvent({
    req,
    reportId,
    eventName: "manual_analysis_report_created",
    phase: "admin_manual_storage",
    payload: { gender, analysisTone, locale, bytes: imageBuffer.length, detectedFaceCount: manualDetectedFaceCount },
  });

  waitUntil(
    drainAnalysisQueue({ targetId: reportId }).catch((error) =>
      logServiceEvent({
        req,
        reportId,
        eventName: "manual_analysis_background_start_failed",
        phase: "admin_manual_worker",
        level: "error",
        payload: { message: analysisErrorMessage(error, locale), providerMessage: extractErrorText(error) },
      }),
    ),
  );

  const origin = req.nextUrl.origin;
  return Response.json(
    {
      reportId,
      status: "queued",
      publicResultUrl: `${origin}${localizedResultPath(reportId, locale)}`,
      adminResultUrl: `${origin}/admindata/facereportpages/${reportId}`,
    },
    { status: 202 },
  );
}

function parseGender(value: unknown): Gender | null {
  return value === "male" || value === "female" ? value : null;
}

function parseAnalysisTone(value: unknown): AnalysisTone | null {
  return value === "roast" || value === "balanced" ? value : null;
}

function parseLocale(value: unknown) {
  return isLocale(value) ? normalizeLocale(value) : null;
}

function parseAdminNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_ADMIN_NOTE_CHARS);
  return trimmed || null;
}

function parseDetectedFaceCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2) return null;
  return value;
}

function parseLandmarks(value: unknown): Landmark[] | null {
  if (!Array.isArray(value) || value.length < 468) return null;
  const landmarks = value.map((point) => {
    if (!isObject(point)) return null;
    const x = (point as { x?: unknown }).x;
    const y = (point as { y?: unknown }).y;
    const z = (point as { z?: unknown }).z;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
    return { x, y, z };
  });
  return landmarks.every(Boolean) ? (landmarks as Landmark[]) : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}
