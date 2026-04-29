import { describe, expect, it } from "vitest";
import { shouldRejectImageSourceForAnalysis } from "@/lib/analysis/sourcePolicy";

describe("shouldRejectImageSourceForAnalysis", () => {
  it("rejects non-live sources for normal webcam reports", () => {
    expect(shouldRejectImageSourceForAnalysis("staged_photo", "live_webcam")).toBe(true);
    expect(shouldRejectImageSourceForAnalysis("virtual_camera", undefined)).toBe(true);
  });

  it("accepts non-live sources for administrator manual uploads", () => {
    expect(shouldRejectImageSourceForAnalysis("staged_photo", "manual_upload")).toBe(false);
    expect(shouldRejectImageSourceForAnalysis("other_person", "manual_upload")).toBe(false);
  });

  it("accepts real webcam or missing source values", () => {
    expect(shouldRejectImageSourceForAnalysis("real_webcam", "live_webcam")).toBe(false);
    expect(shouldRejectImageSourceForAnalysis(null, "live_webcam")).toBe(false);
  });
});
