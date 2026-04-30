import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import { ipFromRequest, ipHash } from "@/lib/ratelimit";

type ServiceEventLevel = "debug" | "info" | "warn" | "error";

const OPERATIONAL_WARNING_EVENTS = new Set([
  "analysis_rate_limited",
  "analysis_liveness_rejected",
  "analysis_daily_quota_exceeded",
  "analysis_non_live_input_detected",
  "analysis_job_claim_skipped",
  "analysis_diagnostic_frame_rate_limited",
  "analysis_diagnostic_frame_rejected",
  "face_sample_collection_waiting_long",
  "face_sample_collection_retrying_no_detection",
  "face_landmarker_cpu_fallback_started",
  "face_image_fallback_detected",
  "feedback_rate_limited",
]);

const OPERATIONAL_ERROR_EVENTS = new Set([
  "analysis_report_create_failed",
  "analysis_admin_result_wake_failed",
  "analysis_image_upload_failed",
  "analysis_report_update_failed",
  "analysis_background_start_failed",
  "analysis_result_wake_failed",
  "analysis_status_wake_failed",
  "analysis_drain_failed",
  "analysis_job_failed_unhandled",
  "analysis_report_failed",
  "analysis_client_request_failed",
  "analysis_client_prepare_failed",
  "analysis_diagnostic_frame_store_failed",
  "face_sample_collection_failed_no_landmarks",
  "face_landmarker_runtime_error",
  "feedback_store_failed",
]);

export interface ServiceEventInput {
  eventName: string;
  req?: Request;
  sessionId?: string | null;
  reportId?: string | null;
  phase?: string | null;
  level?: ServiceEventLevel;
  payload?: Record<string, unknown>;
}

export async function logServiceEvent(input: ServiceEventInput): Promise<void> {
  const level = input.level ?? "info";
  const payload = sanitizePayload(input.payload ?? {});
  const ip = input.req ? ipFromRequest(input.req) : null;
  const userAgent = input.req?.headers.get("user-agent") ?? null;
  const hashedIp = ip ? await ipHash(ip) : null;
  const event = {
    event_name: input.eventName,
    phase: input.phase ?? null,
    level,
    session_id: input.sessionId ?? null,
    report_id: normalizeUuid(input.reportId),
    payload,
    user_agent: userAgent,
    ip_hash: hashedIp,
  };

  writeConsoleLog(event);

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("service_events").insert(event);
    if (error) {
      console.error("[service-event-store-failed]", JSON.stringify({ eventName: input.eventName, message: error.message }));
    }
  } catch (error) {
    console.error(
      "[service-event-store-failed]",
      JSON.stringify({ eventName: input.eventName, message: error instanceof Error ? error.message : "unknown" }),
    );
  }
}

function writeConsoleLog(event: Record<string, unknown>) {
  if (process.env.VERBOSE_SERVICE_EVENTS !== "true" && !shouldWriteOperationalConsoleLog(event)) return;

  const line = `[service-event] ${JSON.stringify({ service: "ai-face-report", ...event })}`;
  const consoleLevel = consoleLevelForEvent(event);
  if (consoleLevel === "error") {
    console.error(line);
  } else if (consoleLevel === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function shouldWriteOperationalConsoleLog(event: Record<string, unknown>): boolean {
  const eventName = typeof event.event_name === "string" ? event.event_name : "";
  return OPERATIONAL_ERROR_EVENTS.has(eventName) || OPERATIONAL_WARNING_EVENTS.has(eventName);
}

function consoleLevelForEvent(event: Record<string, unknown>): ServiceEventLevel {
  const eventName = typeof event.event_name === "string" ? event.event_name : "";
  if (OPERATIONAL_ERROR_EVENTS.has(eventName)) return "error";
  if (OPERATIONAL_WARNING_EVENTS.has(eventName)) return "warn";
  if (event.level === "debug" || event.level === "info" || event.level === "warn" || event.level === "error") return event.level;
  return "info";
}

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const blocked = /base64|image|frame|landmark|metric/i;
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !blocked.test(key))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
  if (typeof value === "object" && value) {
    return sanitizePayload(value as Record<string, unknown>);
  }
  return undefined;
}
