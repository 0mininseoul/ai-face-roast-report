import { GoogleGenAI } from "@google/genai";

export const MODEL_ANALYSIS = process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-pro";
export const MODEL_ANALYSIS_FALLBACK = process.env.GEMINI_ANALYSIS_FALLBACK_MODEL ?? "gemini-2.5-flash";
export const MODEL_ANALYSIS_FAST = process.env.GEMINI_ANALYSIS_FAST_MODEL ?? "gemini-2.5-flash-lite";

let cached: GoogleGenAI | null = null;

export function getGenAi(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
