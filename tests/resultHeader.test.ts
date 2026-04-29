import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultHeader } from "@/components/result/ResultHeader";

const mocks = vi.hoisted(() => ({
  loadKakaoSdk: vi.fn(),
  shareKakaoFeed: vi.fn(),
}));

vi.mock("@/lib/kakao/share", () => ({
  loadKakaoSdk: mocks.loadKakaoSdk,
  shareKakaoFeed: mocks.shareKakaoFeed,
}));

describe("ResultHeader", () => {
  beforeEach(() => {
    mocks.loadKakaoSdk.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shares Kakao previews with the result main copy and original face image", async () => {
    render(
      createElement(ResultHeader, {
        shareImageUrl: "https://example.com/api/share-face/report-1?v=kakao-v3",
        resultUrl: "https://example.com/result/report-1",
        shareResultUrl: "https://example.com/result/report-1?share=kakao-v3",
        reportId: "report-1",
        mainCopy: "길에서 번호 한 번쯤은 따이실 법한 얼굴입니다",
        expiryText: "이 페이지는 생성 후 24시간 뒤 사라집니다.",
      }),
    );

    const shareButton = screen.getByRole("button", { name: "카카오톡 공유" });
    await waitFor(() => expect(shareButton).not.toBeDisabled());
    fireEvent.click(shareButton);

    expect(mocks.shareKakaoFeed).toHaveBeenCalledWith({
      title: "길에서 번호 한 번쯤은 따이실 법한 얼굴입니다",
      description: "AI 얼굴 분석 결과 - 이 페이지는 생성 후 24시간 뒤 사라집니다.",
      imageUrl: "https://example.com/api/share-face/report-1?v=kakao-v3",
      resultUrl: "https://example.com/result/report-1?share=kakao-v3",
    });
  });
});
