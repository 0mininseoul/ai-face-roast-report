"use client";

import Link from "next/link";
import { Copy, MessageCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { loadKakaoSdk, shareKakaoFeed } from "@/lib/kakao/share";

export function ResultHeader({
  mainCopy,
  faceImageUrl,
  resultUrl,
}: {
  mainCopy: string;
  faceImageUrl: string;
  resultUrl: string;
}) {
  const [kakaoReady, setKakaoReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadKakaoSdk().then(setKakaoReady);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={!kakaoReady}
            title={kakaoReady ? "카카오톡 공유" : "카카오톡 공유 사용 불가"}
            icon={<MessageCircle className="h-4 w-4" />}
            onClick={() =>
              shareKakaoFeed({
                title: mainCopy,
                description: "AI 얼평보고서 - 이 페이지는 24시간 뒤 사라집니다.",
                imageUrl: faceImageUrl,
                resultUrl,
              })
            }
          >
            카카오톡 공유
          </Button>
          <Button
            variant="ghost"
            icon={<Copy className="h-4 w-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(resultUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "복사됨" : "링크 복사"}
          </Button>
          <Link href="/">
            <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />}>
              다시 분석
            </Button>
          </Link>
        </div>
      </div>
      <div className="border-t border-border/70 px-8 py-2 text-center text-xs font-medium text-text-faint">
        이 페이지는 생성 후 24시간 뒤 사라집니다.
      </div>
    </header>
  );
}
