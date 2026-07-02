import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";

const DEFAULT_VERTEX_AI_LOCATION = "global";

export const MODEL_ANALYSIS = process.env.VERTEX_AI_MODEL ?? "gemini-2.5-pro";
export const MODEL_ANALYSIS_FALLBACK = process.env.VERTEX_AI_FALLBACK_MODEL ?? "gemini-2.5-flash";
export const MODEL_ANALYSIS_FAST = process.env.VERTEX_AI_FAST_MODEL ?? "gemini-2.5-flash-lite";

let cached: GoogleGenAI | null = null;

export function getGenAi(): GoogleGenAI {
  if (cached) return cached;
  cached = new GoogleGenAI(buildVertexAiOptions());
  return cached;
}

function buildVertexAiOptions(): GoogleGenAIOptions {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_VERTEX_AI_LOCATION;

  if (!project) throw new Error("Missing GOOGLE_CLOUD_PROJECT");

  const options: GoogleGenAIOptions = {
    vertexai: true,
    project,
    location,
    apiVersion: "v1",
  };
  const credentials = parseServiceAccountCredentials();
  if (credentials) {
    options.googleAuthOptions = { credentials };
  }
  return options;
}

function parseServiceAccountCredentials(): Record<string, unknown> | undefined {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) return undefined;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (!isRecord(parsed)) throw new Error("decoded value is not a JSON object");
    return parsed;
  } catch (error) {
    throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
