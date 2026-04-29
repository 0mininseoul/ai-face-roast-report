import { describe, expect, it } from "vitest";
import { buildAnalyzeUserPrompt } from "@/lib/gemini/promptText";

describe("buildAnalyzeUserPrompt", () => {
  it("includes gender, report id, and metrics", () => {
    const prompt = buildAnalyzeUserPrompt("male", { asymmetryIndex: 0.12 } as any, "report-1");
    expect(prompt).toContain("male");
    expect(prompt).toContain("report-1");
    expect(prompt).toContain("0.12");
  });

  it("includes manual upload context when provided", () => {
    const prompt = buildAnalyzeUserPrompt("female", { asymmetryIndex: 0.2 } as any, "report-2", {
      analysisSource: "manual_upload",
      analysisTone: "balanced",
      manualDetectedFaceCount: 2,
    });

    expect(prompt).toContain("analysis_source: manual_upload");
    expect(prompt).toContain("analysis_tone: balanced");
    expect(prompt).toContain("manual_detected_face_count: 2");
  });
});
