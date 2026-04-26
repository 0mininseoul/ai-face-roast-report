import { NextRequest } from "next/server";
import { getGenAi, MODEL_ANALYSIS } from "@/lib/gemini/client";
import { buildAnalyzeUserPrompt } from "@/lib/gemini/promptText";
import { readAnalyzeSystemPrompt } from "@/lib/gemini/prompts";
import { normalizeGeminiReport, REPORT_RESPONSE_JSON_SCHEMA } from "@/lib/gemini/reportSchema";
import { pickMainCopy } from "@/lib/copy/mainCopy";
import { analysisErrorMessage, extractErrorText, isRetryableAnalysisError } from "@/lib/analysis/errors";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { AnalyzeRequestBody, AnalyzeSseEvent, ReportSections } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANALYSIS_RETRY_DELAYS_MS = [1200, 2800, 5200, 8500];

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
      status: "analyzing",
      metrics_json: body.metrics,
      landmarks_json: body.landmarks ?? null,
      user_agent: userAgent,
      ip_hash: hashedIp,
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
    await supabase.from("face_reports").update({ status: "failed" }).eq("id", reportId);
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

  await supabase.from("face_reports").update({ face_image_path: facePath }).eq("id", reportId);
  await logServiceEvent({
    req,
    sessionId: body.clientSessionId,
    reportId,
    eventName: "analysis_image_uploaded",
    phase: "server_storage",
    payload: { bytes: imageBuffer.length },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const eventWrites: Array<Promise<void>> = [];
      const record = (eventName: string, payload?: Record<string, unknown>, level: "debug" | "info" | "warn" | "error" = "info") => {
        const write = logServiceEvent({
          req,
          sessionId: body.clientSessionId,
          reportId,
          eventName,
          phase: "server_stream",
          level,
          payload,
        }).catch(() => undefined);
        eventWrites.push(write);
        return write;
      };
      const send = (event: AnalyzeSseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        send({ type: "report_id", reportId });
        void record("analysis_sse_report_id_sent");

        const ai = getGenAi();
        const systemInstruction = await readAnalyzeSystemPrompt();
        await record("analysis_ai_stream_started", {
          model: MODEL_ANALYSIS,
          promptChars: systemInstruction.length,
        });
        const { raw, chunkCount } = await streamAnalysisWithRetry({
          createStream: () =>
            ai.models.generateContentStream({
              model: MODEL_ANALYSIS,
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: buildAnalyzeUserPrompt(body.gender, body.metrics, reportId) },
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                  ],
                },
              ],
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseJsonSchema: REPORT_RESPONSE_JSON_SCHEMA,
                temperature: 0.95,
              },
            }),
          send,
          record,
        });

        const sections = postprocessReportSections(parseReport(raw));
        const mainCopy = pickMainCopy(body.gender, reportId);
        await supabase
          .from("face_reports")
          .update({
            status: "complete",
            report_sections_json: sections,
            main_copy: mainCopy,
          })
          .eq("id", reportId);

        send({ type: "complete", reportId, sections });
        await record("analysis_report_completed", { chunkCount, totalChars: raw.length });
      } catch (error) {
        await supabase.from("face_reports").update({ status: "failed" }).eq("id", reportId);
        const providerMessage = extractErrorText(error);
        const message = analysisErrorMessage(error);
        await record("analysis_report_failed", { message, providerMessage }, "error");
        send({ type: "error", message });
      } finally {
        await Promise.allSettled(eventWrites);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function streamAnalysisWithRetry({
  createStream,
  send,
  record,
}: {
  createStream: () => Promise<AsyncIterable<{ text?: string }>>;
  send: (event: AnalyzeSseEvent) => void;
  record: (eventName: string, payload?: Record<string, unknown>, level?: "debug" | "info" | "warn" | "error") => Promise<void>;
}) {
  let lastError: unknown = null;
  const maxAttempts = ANALYSIS_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let raw = "";
    let chunkCount = 0;

    try {
      await record("analysis_ai_attempt_started", { attempt: attempt + 1 });
      if (attempt > 0) {
        send({
          type: "status",
          message: `AI 분석 서버가 혼잡해 재시도 중입니다 (${attempt + 1}/${maxAttempts})`,
          attempt: attempt + 1,
          maxAttempts,
        });
      }
      const response = await createStream();

      for await (const chunk of response) {
        const text = chunk.text ?? "";
        if (!text) continue;
        raw += text;
        chunkCount += 1;
        send({ type: "chunk", text });
        void record("analysis_ai_chunk", { attempt: attempt + 1, chunkCount, chunkChars: text.length, totalChars: raw.length }, "debug");
      }

      return { raw, chunkCount };
    } catch (error) {
      lastError = error;
      const canRetry = chunkCount === 0 && attempt < ANALYSIS_RETRY_DELAYS_MS.length && isRetryableAnalysisError(error);
      await record(
        canRetry ? "analysis_ai_retry_scheduled" : "analysis_ai_attempt_failed",
        { attempt: attempt + 1, message: analysisErrorMessage(error), providerMessage: extractErrorText(error), canRetry },
        canRetry ? "warn" : "error",
      );

      if (!canRetry) break;
      const delayMs = withJitter(ANALYSIS_RETRY_DELAYS_MS[attempt]!);
      send({
        type: "status",
        message: `AI 분석 서버가 혼잡해 ${Math.ceil(delayMs / 1000)}초 뒤 자동 재시도합니다 (${attempt + 2}/${maxAttempts})`,
        attempt: attempt + 2,
        maxAttempts,
      });
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error("Unknown analysis error");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number) {
  return Math.round(ms + Math.random() * 700);
}

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function parseReport(raw: string): ReportSections {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return normalizeGeminiReport(JSON.parse(trimmed));
}
