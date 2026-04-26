import { describe, expect, it } from "vitest";
import { buildAnalyzeUserPrompt } from "@/lib/gemini/promptText";

describe("buildAnalyzeUserPrompt", () => {
  it("includes gender, report id, and metrics", () => {
    const prompt = buildAnalyzeUserPrompt("male", { asymmetryIndex: 0.12 } as any, "report-1");
    expect(prompt).toContain("male");
    expect(prompt).toContain("report-1");
    expect(prompt).toContain("0.12");
  });
});
