import { NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, ipFromRequest } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

const diagnosticFrameSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  reportId: z.string().trim().uuid().nullable().optional(),
  eventName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.:-]+$/),
  imageBase64: z.string().min(1).max(800_000),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`diagnostic-frame:${ip}`);
  if (!limit.ok) {
    await logServiceEvent({
      req,
      eventName: "analysis_diagnostic_frame_rate_limited",
      phase: "server_storage",
      level: "warn",
      payload: { retryAfterSec: limit.retryAfterSec },
    });
    return new Response(null, { status: 204 });
  }

  let body: z.infer<typeof diagnosticFrameSchema>;
  try {
    body = diagnosticFrameSchema.parse(await req.json());
  } catch {
    return new Response(null, { status: 204 });
  }

  const cleanBase64 = stripDataUrl(body.imageBase64);
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(cleanBase64, "base64");
  } catch {
    return new Response(null, { status: 204 });
  }

  if (imageBuffer.length === 0 || imageBuffer.length > 600_000) {
    await logServiceEvent({
      req,
      sessionId: body.sessionId,
      reportId: body.reportId ?? null,
      eventName: "analysis_diagnostic_frame_rejected",
      phase: "server_storage",
      level: "warn",
      payload: { sourceEventName: body.eventName, bytes: imageBuffer.length },
    });
    return new Response(null, { status: 204 });
  }

  const safeSessionId = safePathSegment(body.sessionId);
  const safeEventName = safePathSegment(body.eventName);
  const path = `diagnostics/${safeSessionId}/${Date.now()}-${safeEventName}.jpg`;

  const supabase = getServerSupabase();
  const { error } = await supabase.storage.from("face-images").upload(path, imageBuffer, {
    contentType: "image/jpeg",
    cacheControl: "86400",
    upsert: false,
  });

  if (error) {
    await logServiceEvent({
      req,
      sessionId: body.sessionId,
      reportId: body.reportId ?? null,
      eventName: "analysis_diagnostic_frame_store_failed",
      phase: "server_storage",
      level: "error",
      payload: { sourceEventName: body.eventName, message: error.message },
    });
    return new Response(null, { status: 204 });
  }

  await logServiceEvent({
    req,
    sessionId: body.sessionId,
    reportId: body.reportId ?? null,
    eventName: "analysis_diagnostic_frame_stored",
    phase: "server_storage",
    payload: {
      sourceEventName: body.eventName,
      diagnosticPath: path,
      bytes: imageBuffer.length,
      ...(body.payload ?? {}),
    },
  });

  return new Response(null, { status: 204 });
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 120);
}
