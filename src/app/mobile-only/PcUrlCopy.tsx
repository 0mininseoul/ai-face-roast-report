"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { loadKakaoSdk, shareKakaoFeed } from "@/lib/kakao/share";

const DEFAULT_URL = "https://faceroast.vercel.app";

export function PcUrlCopy() {
  const [pcUrl, setPcUrl] = useState(DEFAULT_URL);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    setPcUrl(window.location.origin);
    void loadKakaoSdk().then(setKakaoReady);
  }, []);

  const shareKakao = () => {
    shareKakaoFeed({
      title: "AI 얼평보고서",
      description: "AI가 분석하는 내 얼굴 점수 - PC 웹캠으로 바로 시작",
      imageUrl: `${pcUrl}/og-image.png`,
      resultUrl: pcUrl,
    });
  };

  return (
    <div className="mt-6 border-t border-border/70 pt-5">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-black/20 p-2">
        <div className="min-w-0 flex-1 truncate px-2 text-left text-[0.8rem] font-semibold leading-5 text-text-primary">
          {pcUrl}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 shrink-0 px-3 text-xs"
          disabled={!kakaoReady}
          aria-label="카카오톡으로 보내기"
          title={kakaoReady ? "카카오톡으로 보내기" : "카카오톡 공유 사용 불가"}
          icon={<KakaoIcon className="h-4 w-4 rounded-[4px]" />}
          onClick={shareKakao}
        >
          보내기
        </Button>
      </div>
    </div>
  );
}
