import { describe, expect, it } from "vitest";
import presets from "../content/main-copy-presets.json";
import enPresets from "../content/main-copy-presets.en.json";
import jaPresets from "../content/main-copy-presets.ja.json";
import balancedPresets from "../content/balanced-main-copy-presets.json";
import balancedEnPresets from "../content/balanced-main-copy-presets.en.json";
import { pickBalancedMainCopy, pickMainCopy } from "@/lib/copy/mainCopy";

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

  it("draws balanced copy from the editable balanced preset file", () => {
    const pool = new Set<string>([
      ...balancedPresets.under_35.neutral,
      ...balancedPresets.under_35.male,
      ...balancedPresets.under_35.female,
      ...balancedPresets.over_35.neutral,
      ...balancedPresets.over_35.male,
      ...balancedPresets.over_35.female,
    ]);

    for (let index = 0; index < 12; index += 1) {
      const copy = pickBalancedMainCopy("female", index % 2 === 0 ? "under_35" : "over_35", `balanced-${index}`);
      expect(pool.has(copy)).toBe(true);
      expect(copy).not.toMatch(/[ㅅㅆ]\s*ㅂ|[씨시]\s*발|좆|존\s*나|병\s*신|와꾸|ㅋ{2,}/);
      expect(copy).not.toMatch(/조명|카메라|앵글|각도|거리|촬영/);
    }
  });

  it("draws English and Japanese copy from locale-specific preset files", () => {
    const enPool = new Set<string>([
      ...enPresets.under_35.neutral,
      ...enPresets.under_35.male,
      ...enPresets.under_35.female,
      ...enPresets.over_35.neutral,
      ...enPresets.over_35.male,
      ...enPresets.over_35.female,
    ]);
    const jaPool = new Set<string>([
      ...jaPresets.under_35.neutral,
      ...jaPresets.under_35.male,
      ...jaPresets.under_35.female,
      ...jaPresets.over_35.neutral,
      ...jaPresets.over_35.male,
      ...jaPresets.over_35.female,
    ]);
    const balancedEnPool = new Set<string>([
      ...balancedEnPresets.under_35.neutral,
      ...balancedEnPresets.under_35.male,
      ...balancedEnPresets.under_35.female,
      ...balancedEnPresets.over_35.neutral,
      ...balancedEnPresets.over_35.male,
      ...balancedEnPresets.over_35.female,
    ]);

    expect(enPool.has(pickMainCopy("male", "under_35", "en-seed", "en"))).toBe(true);
    expect(jaPool.has(pickMainCopy("female", "over_35", "ja-seed", "ja"))).toBe(true);
    expect(balancedEnPool.has(pickBalancedMainCopy("female", "under_35", "balanced-en", "en"))).toBe(true);
  });
});
