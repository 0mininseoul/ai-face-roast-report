import { NextRequest } from "next/server";
import { z } from "zod";
import { logServiceEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

const eventBodySchema = z.object({
  sessionId: z.string().trim().min(1).max(120).optional(),
  reportId: z.string().trim().uuid().nullable().optional(),
  eventName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.:-]+$/),
  phase: z.string().trim().max(120).optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof eventBodySchema>;
  try {
    body = eventBodySchema.parse(await req.json());
  } catch {
    return new Response(null, { status: 204 });
  }

  await logServiceEvent({
    req,
    eventName: body.eventName,
    sessionId: body.sessionId,
    reportId: body.reportId,
    phase: body.phase,
    level: body.level,
    payload: body.payload,
  });

  return new Response(null, { status: 204 });
}
