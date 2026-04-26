import { describe, expect, it } from "vitest";
import { pickMainCopy } from "@/lib/copy/mainCopy";

describe("pickMainCopy", () => {
  it("returns a stable preset for the same seed", () => {
    expect(pickMainCopy("male", "seed-1")).toBe(pickMainCopy("male", "seed-1"));
  });

  it("returns editable local copy instead of model output", () => {
    expect(pickMainCopy("female", "seed-2").length).toBeGreaterThan(5);
  });
});
