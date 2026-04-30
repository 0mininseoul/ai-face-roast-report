import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("locale middleware", () => {
  it("redirects root requests to the best Accept-Language locale", () => {
    const response = middleware(
      new NextRequest("https://example.com/", {
        headers: { "accept-language": "ja-JP,ja;q=0.9,en;q=0.8" },
      }),
    );

    expect(response.headers.get("location")).toBe("https://example.com/ja");
  });

  it("prefixes legacy public routes with the detected locale", () => {
    const response = middleware(
      new NextRequest("https://example.com/result/report-1?share=kakao", {
        headers: { "accept-language": "en-US,en;q=0.9" },
      }),
    );

    expect(response.headers.get("location")).toBe("https://example.com/en/result/report-1?share=kakao");
  });

  it("does not redirect API requests", () => {
    const response = middleware(
      new NextRequest("https://example.com/api/analyze", {
        headers: { "accept-language": "en-US,en;q=0.9" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
  });
});
