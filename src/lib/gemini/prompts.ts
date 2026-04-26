import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Gender } from "@/types/analysis";

const ANALYZE_PROMPT_PATH = path.join(process.cwd(), "prompts", "analyze-system.md");
const LIVE_PROMPT_PATH = path.join(process.cwd(), "prompts", "live-comment.md");

export async function readAnalyzeSystemPrompt(): Promise<string> {
  return readFile(ANALYZE_PROMPT_PATH, "utf8");
}

export async function readLiveCommentPrompt(gender: Gender, previousComments: string[]): Promise<string> {
  const template = await readFile(LIVE_PROMPT_PATH, "utf8");
  const previous =
    previousComments.length > 0
      ? previousComments.map((comment, index) => `${index + 1}. ${comment}`).join("\n")
      : "(없음)";

  return template.replaceAll("{{gender}}", gender).replaceAll("{{previousComments}}", previous);
}
