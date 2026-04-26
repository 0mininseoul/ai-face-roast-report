import { NextRequest } from "next/server";
import { getGenAi, MODEL_ANALYSIS } from "@/lib/gemini/client";
import { buildAnalyzeUserPrompt } from "@/lib/gemini/promptText";
import { readAnalyzeSystemPrompt } from "@/lib/gemini/prompts";
import { normalizeGeminiReport, REPORT_RESPONSE_JSON_SCHEMA } from "@/lib/gemini/reportSchema";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AnalyzeRequestBody, AnalyzeSseEvent, ReportSections } from "@/types/analysis";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`analyze:${ip}`);
  if (!limit.ok) {
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfterSec }, { status: 429 });
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.gender || !body.metrics || !body.imageBase64) {
    return new Response("Missing required fields", { status: 400 });
  }

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
    return new Response("Failed to create report", { status: 500 });
  }

  const reportId = String(inserted.id);
  const cleanBase64 = stripDataUrl(body.imageBase64);
  const imageBuffer = Buffer.from(cleanBase64, "base64");
  const facePath = `${reportId}/capture.jpg`;

  const { error: uploadError } = await supabase.storage.from("face-images").upload(facePath, imageBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (uploadError) {
    await supabase.from("face_reports").update({ status: "failed" }).eq("id", reportId);
    return new Response("Failed to store face image", { status: 500 });
  }

  await supabase.from("face_reports").update({ face_image_path: facePath }).eq("id", reportId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeSseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        send({ type: "report_id", reportId });

        const ai = getGenAi();
        const systemInstruction = await readAnalyzeSystemPrompt();
        const response = await ai.models.generateContentStream({
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
        });

        let raw = "";
        for await (const chunk of response) {
          const text = chunk.text ?? "";
          if (!text) continue;
          raw += text;
          send({ type: "chunk", text });
        }

        const sections = parseReport(raw);
        await supabase
          .from("face_reports")
          .update({
            status: "complete",
            report_sections_json: sections,
            main_copy: sections.mainCopy,
          })
          .eq("id", reportId);

        send({ type: "complete", reportId, sections });
      } catch (error) {
        await supabase.from("face_reports").update({ status: "failed" }).eq("id", reportId);
        send({ type: "error", message: error instanceof Error ? error.message : "Unknown analysis error" });
      } finally {
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

function stripDataUrl(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function parseReport(raw: string): ReportSections {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return normalizeGeminiReport(JSON.parse(trimmed));
}
