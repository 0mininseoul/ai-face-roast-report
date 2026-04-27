import { describe, expect, it } from "vitest";
import { formatKstTimestamp } from "@/components/result/FaceImage";

describe("formatKstTimestamp", () => {
  it("formats timestamps in Korea Standard Time regardless of runtime timezone", () => {
    expect(formatKstTimestamp("2026-04-26T23:42:12.000Z")).toBe("2026. 4. 27. AM 8:42:12");
  });
});
