import { NextRequest } from "next/server";
import { getGenAi, MODEL_LIVE } from "@/lib/gemini/client";
import { readLiveCommentPrompt } from "@/lib/gemini/prompts";
import { checkRateLimit, ipFromRequest } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { Gender } from "@/types/analysis";

export const runtime = "nodejs";

interface LiveCommentBody {
  reportId: string;
  gender: Gender;
  imageBase64: string;
  clientSessionId?: string;
}

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`live:${ip}`);
  if (!limit.ok) {
    await logServiceEvent({
      req,
      eventName: "live_comment_rate_limited",
      phase: "server_request",
      level: "warn",
      payload: { retryAfterSec: limit.retryAfterSec },
    });
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfterSec }, { status: 429 });
  }

  let body: LiveCommentBody;
  try {
    body = (await req.json()) as LiveCommentBody;
  } catch {
    await logServiceEvent({ req, eventName: "live_comment_invalid_json", phase: "server_request", level: "warn" });
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.reportId || !body.gender || !body.imageBase64) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId: body.reportId,
      eventName: "live_comment_missing_required_fields",
      phase: "server_request",
      level: "warn",
      payload: { hasReportId: Boolean(body.reportId), hasGender: Boolean(body.gender), hasCapture: Boolean(body.imageBase64) },
    });
    return new Response("Missing required fields", { status: 400 });
  }

  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    reportId: body.reportId,
    eventName: "live_comment_request_received",
    phase: "server_request",
    payload: { gender: body.gender },
  });

  const supabase = getServerSupabase();
  const { data: report, error } = await supabase
    .from("face_reports")
    .select("live_feed_json")
    .eq("id", body.reportId)
    .single();

  if (error) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId: body.reportId,
      eventName: "live_comment_report_not_found",
      phase: "server_storage",
      level: "warn",
      payload: { message: error.message },
    });
    return new Response("Report not found", { status: 404 });
  }

  const previous = Array.isArray(report?.live_feed_json) ? (report.live_feed_json as string[]) : [];
  const prompt = await readLiveCommentPrompt(body.gender, previous.slice(-5));
  const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

  try {
    const ai = getGenAi();
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId: body.reportId,
      eventName: "live_comment_gemini_started",
      phase: "server_gemini",
      payload: { previousCount: previous.length, model: MODEL_LIVE },
    });
    const response = await ai.models.generateContent({
      model: MODEL_LIVE,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }],
        },
      ],
      config: {
        temperature: 1.0,
        maxOutputTokens: 120,
      },
    });

    const comment = (response.text ?? "").trim();
    const next = [...previous, comment].slice(-20);
    await supabase.from("face_reports").update({ live_feed_json: next }).eq("id", body.reportId);
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId: body.reportId,
      eventName: "live_comment_completed",
      phase: "server_storage",
      payload: { chars: comment.length, nextCount: next.length },
    });

    return Response.json({ comment });
  } catch (error) {
    await logServiceEvent({
      req,
      sessionId: body.clientSessionId,
      reportId: body.reportId,
      eventName: "live_comment_failed",
      phase: "server_gemini",
      level: "error",
      payload: { message: error instanceof Error ? error.message : "Unknown live comment error" },
    });
    return new Response("Live comment failed", { status: 500 });
  }
}
