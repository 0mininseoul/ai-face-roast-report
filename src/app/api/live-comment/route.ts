import { NextRequest } from "next/server";
import { getGenAi, MODEL_LIVE } from "@/lib/gemini/client";
import { readLiveCommentPrompt } from "@/lib/gemini/prompts";
import { checkRateLimit, ipFromRequest } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Gender } from "@/types/analysis";

export const runtime = "nodejs";

interface LiveCommentBody {
  reportId: string;
  gender: Gender;
  imageBase64: string;
}

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const limit = checkRateLimit(`live:${ip}`);
  if (!limit.ok) {
    return Response.json({ error: "rate_limited", retryAfter: limit.retryAfterSec }, { status: 429 });
  }

  let body: LiveCommentBody;
  try {
    body = (await req.json()) as LiveCommentBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.reportId || !body.gender || !body.imageBase64) {
    return new Response("Missing required fields", { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: report, error } = await supabase
    .from("face_reports")
    .select("live_feed_json")
    .eq("id", body.reportId)
    .single();

  if (error) {
    return new Response("Report not found", { status: 404 });
  }

  const previous = Array.isArray(report?.live_feed_json) ? (report.live_feed_json as string[]) : [];
  const prompt = await readLiveCommentPrompt(body.gender, previous.slice(-5));
  const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

  const ai = getGenAi();
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

  return Response.json({ comment });
}
