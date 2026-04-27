import { describe, expect, it } from "vitest";
import { buildAnalysisModelChain } from "@/lib/gemini/modelSelection";

describe("buildAnalysisModelChain", () => {
  it("prefers the primary model before fallback models", () => {
    expect(
      buildAnalysisModelChain({
        primaryModel: "gemini-2.5-pro",
        fallbackModel: "gemini-2.5-flash",
        fastModel: "gemini-2.5-flash-lite",
      }),
    ).toEqual(["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]);
  });

  it("deduplicates matching models", () => {
    expect(
      buildAnalysisModelChain({
        primaryModel: "gemini-2.5-flash-lite",
        fastModel: "gemini-2.5-flash-lite",
      }),
    ).toEqual(["gemini-2.5-flash-lite"]);
  });
});
