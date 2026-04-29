import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FaceImage, formatKstTimestamp } from "@/components/result/FaceImage";

describe("formatKstTimestamp", () => {
  it("formats timestamps in Korea Standard Time regardless of runtime timezone", () => {
    expect(formatKstTimestamp("2026-04-26T23:42:12.000Z")).toBe("2026. 4. 27. AM 8:42:12");
  });

  it("preserves image ratio for manual upload results", () => {
    render(createElement(FaceImage, { src: "/face.jpg", createdAt: "2026-04-26T23:42:12.000Z", fit: "contain" }));

    expect(screen.getByAltText("분석에 사용된 얼굴 캡쳐")).toHaveClass("object-contain");
  });
});
