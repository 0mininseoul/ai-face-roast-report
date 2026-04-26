"use client";

import Link from "next/link";
import { Clock3, Copy, MessageCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { loadKakaoSdk, shareKakaoFeed } from "@/lib/kakao/share";

export function ResultHeader({ shareImageUrl, resultUrl }: { shareImageUrl: string; resultUrl: string }) {
  const [kakaoReady, setKakaoReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadKakaoSdk().then(setKakaoReady);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-8 sm:py-4">
        <Link href="/" aria-label="처음 화면으로 이동" className="rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-info focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
          <span className="block sm:hidden">
            <Logo compact />
          </span>
          <span className="hidden sm:block">
            <Logo />
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            className="px-3 sm:px-4"
            disabled={!kakaoReady}
            aria-label="카카오톡 공유"
            title={kakaoReady ? "카카오톡 공유 - 얼굴 사진 미리보기 제외" : "카카오톡 공유 사용 불가"}
            icon={<MessageCircle className="h-4 w-4" />}
            onClick={() =>
              shareKakaoFeed({
                title: "AI 얼평보고서 결과",
                description: "오락용 AI 얼굴 분석 결과 - 이 페이지는 생성 후 24시간 뒤 사라집니다.",
                imageUrl: shareImageUrl,
                resultUrl,
              })
            }
          >
            <span className="hidden sm:inline">카카오톡 공유</span>
          </Button>
          <Button
            variant="ghost"
            className="px-3 sm:px-4"
            aria-label="링크 복사"
            title="링크 복사"
            icon={<Copy className="h-4 w-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(resultUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            <span className="hidden sm:inline">{copied ? "복사됨" : "링크 복사"}</span>
          </Button>
          <Link href="/" aria-label="다시 분석">
            <Button
              variant="ghost"
              className="px-3 sm:px-4"
              aria-label="다시 분석"
              title="다시 분석"
              icon={<RotateCcw className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">다시 분석</span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="border-t border-border/70 bg-black/24 px-4 py-2 sm:px-8 sm:py-3">
        <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border border-accent-info/20 bg-accent-info/8 px-3 py-1.5 text-xs font-black text-text-primary shadow-[0_0_32px_rgb(125_216_255_/_0.08)] sm:px-4 sm:py-2 sm:text-sm">
          <Clock3 className="h-3.5 w-3.5 text-accent-info sm:h-4 sm:w-4" />
          <span>이 페이지는 생성 후 24시간 뒤 사라집니다.</span>
        </div>
      </div>
    </header>
  );
}
