"use client";

const SESSION_STORAGE_KEY = "ai-face-report-session-id";
const DEVICE_STORAGE_KEY = "ai-face-report-device-id";

export type ClientEventLevel = "debug" | "info" | "warn" | "error";

export interface ClientEventPayload {
  eventName: string;
  phase?: string;
  reportId?: string | null;
  level?: ClientEventLevel;
  payload?: Record<string, unknown>;
}

export function getClientSessionId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next = generateRandomId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

export function getClientDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const next = generateRandomId();
    window.localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    return getClientSessionId();
  }
}

function generateRandomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function logClientEvent(input: ClientEventPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    sessionId: getClientSessionId(),
    eventName: input.eventName,
    phase: input.phase,
    reportId: input.reportId,
    level: input.level ?? "info",
    payload: sanitizePayload(input.payload ?? {}),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/events", blob)) return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
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
