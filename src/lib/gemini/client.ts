import { GoogleGenAI } from "@google/genai";

export const MODEL_ANALYSIS = process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-pro";

let cached: GoogleGenAI | null = null;

export function getGenAi(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  cached = new GoogleGenAI({ apiKey });
  return cached;
}
