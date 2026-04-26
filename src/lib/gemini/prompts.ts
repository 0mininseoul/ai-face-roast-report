import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const ANALYZE_PROMPT_PATH = path.join(process.cwd(), "prompts", "analyze-system.md");

export async function readAnalyzeSystemPrompt(): Promise<string> {
  return readFile(ANALYZE_PROMPT_PATH, "utf8");
}
