import { describe, expect, it } from "vitest";
import { buildAnalysisModelChain } from "@/lib/gemini/modelSelection";

describe("buildAnalysisModelChain", () => {
  it("prefers the fast model before the primary model", () => {
    expect(
      buildAnalysisModelChain({
        primaryModel: "gemini-2.5-pro",
        fastModel: "gemini-2.5-flash-lite",
      }),
    ).toEqual(["gemini-2.5-flash-lite", "gemini-2.5-pro"]);
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
