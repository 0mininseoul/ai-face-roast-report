import { NextRequest } from "next/server";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

const MIN_LENGTH = 1;
const MAX_LENGTH = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface FeedbackBody {
  message?: string;
  reportId?: string | null;
}

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`feedback:${ip}`);
  if (!limit.ok) {
    await logServiceEvent({
      req,
      eventName: "feedback_rate_limited",
      phase: "server_request",
      level: "warn",
      payload: { retryAfterSec: limit.retryAfterSec },
    });
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfterSec }, { status: 429 });
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (message.length < MIN_LENGTH || message.length > MAX_LENGTH) {
    return Response.json({ error: "invalid_message_length" }, { status: 400 });
  }

  const reportId = body.reportId && UUID_RE.test(body.reportId) ? body.reportId : null;
  const userAgent = req.headers.get("user-agent") ?? null;
  const hashedIp = await ipHash(ip);

  const supabase = getServerSupabase();
  const { error } = await supabase.from("feedback").insert({
    message,
    report_id: reportId,
    user_agent: userAgent,
    ip_hash: hashedIp,
  });

  if (error) {
    await logServiceEvent({
      req,
      reportId,
      eventName: "feedback_store_failed",
      phase: "server_storage",
      level: "error",
      payload: { message: error.message },
    });
    return Response.json({ error: "store_failed" }, { status: 500 });
  }

  await logServiceEvent({
    req,
    reportId,
    eventName: "feedback_received",
    phase: "server_request",
    payload: { messageLength: message.length, hasReportId: Boolean(reportId) },
  });

  return Response.json({ ok: true });
}
