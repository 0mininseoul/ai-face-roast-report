import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import { ipFromRequest, ipHash } from "@/lib/ratelimit";

type ServiceEventLevel = "debug" | "info" | "warn" | "error";

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
  const line = `[service-event] ${JSON.stringify({ service: "ai-face-report", ...event })}`;
  if (event.level === "error") {
    console.error(line);
  } else if (event.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
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
