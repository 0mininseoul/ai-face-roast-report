import { describe, expect, it } from "vitest";
import { placeOverlay } from "@/lib/facemesh/overlayPlacement";

describe("placeOverlay", () => {
  it("uses outer slots when face is large", () => {
    const placed = placeOverlay({
      faceBox: { x: 0.1, y: 0.1, width: 0.85, height: 0.85 },
      viewport: { width: 1920, height: 1080 },
      existingSlots: [],
    });
    expect(["R1", "L1"]).toContain(placed.slot);
  });

  it("centers conclusion cards", () => {
    const placed = placeOverlay({
      faceBox: null,
      viewport: { width: 1920, height: 1080 },
      existingSlots: [],
      kind: "conclusion",
    });
    expect(placed.slot).toBe("CENTER");
  });
});
