import { describe, expect, it } from "vitest";
import presets from "../content/main-copy-presets.json";
import { pickMainCopy } from "@/lib/copy/mainCopy";

describe("pickMainCopy", () => {
  it("returns a stable preset for the same seed", () => {
    expect(pickMainCopy("male", "under_35", "seed-1")).toBe(pickMainCopy("male", "under_35", "seed-1"));
    expect(pickMainCopy("female", "over_35", "seed-2")).toBe(pickMainCopy("female", "over_35", "seed-2"));
  });

  it("returns editable local copy instead of model output", () => {
    expect(pickMainCopy("female", "under_35", "seed-2").length).toBeGreaterThan(5);
    expect(pickMainCopy("male", "over_35", "seed-3").length).toBeGreaterThan(5);
  });

  it("draws under_35 copy from the under_35 pool", () => {
    const pool = new Set<string>([
      ...presets.under_35.neutral,
      ...presets.under_35.male,
      ...presets.under_35.female,
    ]);
    for (let index = 0; index < 12; index += 1) {
      expect(pool.has(pickMainCopy("male", "under_35", `s-${index}`))).toBe(true);
      expect(pool.has(pickMainCopy("female", "under_35", `s-${index}`))).toBe(true);
    }
  });

  it("draws over_35 copy from the over_35 pool with a polite tone", () => {
    const pool = new Set<string>([
      ...presets.over_35.neutral,
      ...presets.over_35.male,
      ...presets.over_35.female,
    ]);
    for (let index = 0; index < 12; index += 1) {
      const male = pickMainCopy("male", "over_35", `s-${index}`);
      const female = pickMainCopy("female", "over_35", `s-${index}`);
      expect(pool.has(male)).toBe(true);
      expect(pool.has(female)).toBe(true);
      expect(male).not.toMatch(/ㅋ{2,}/);
      expect(female).not.toMatch(/ㅋ{2,}/);
    }
  });
});
