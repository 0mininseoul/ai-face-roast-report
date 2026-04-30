"use client";

import Link from "next/link";
import { Clock3, Copy, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { Logo } from "@/components/ui/Logo";
import { loadKakaoSdk, shareKakaoFeed } from "@/lib/kakao/share";
import { FeedbackButton } from "@/components/result/FeedbackButton";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export function ResultHeader({
  shareImageUrl,
  resultUrl,
  shareResultUrl = resultUrl,
  reportId,
  mainCopy,
  expiryText,
  locale = DEFAULT_LOCALE,
}: {
  shareImageUrl: string;
  resultUrl: string;
  shareResultUrl?: string;
  reportId: string;
  mainCopy: string;
  expiryText?: string;
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);
  const displayedExpiryText = expiryText ?? dictionary.result.expiry24;
  const [kakaoReady, setKakaoReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (locale !== "ko") return;
    void loadKakaoSdk().then(setKakaoReady);
  }, [locale]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-8 sm:py-4">
        <Link href={`/${locale}`} aria-label={dictionary.result.homeAria} className="rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-info focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary">
          <span className="block sm:hidden">
            <Logo compact locale={locale} />
          </span>
          <span className="hidden sm:block">
            <Logo locale={locale} />
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {locale === "ko" && (
            <Button
              variant="ghost"
              className="px-3 sm:px-4"
              disabled={!kakaoReady}
              aria-label={dictionary.result.kakaoShare}
              title={kakaoReady ? dictionary.result.kakaoShare : dictionary.result.kakaoUnavailable}
              icon={<KakaoIcon className="h-5 w-5 rounded-[5px]" />}
              onClick={() =>
                shareKakaoFeed({
                  title: mainCopy || dictionary.brand.resultTitle,
                  description: `${dictionary.metadata.resultDescriptionPrefix} - ${displayedExpiryText}`,
                  imageUrl: shareImageUrl,
                  resultUrl: shareResultUrl,
                  buttonTitle: dictionary.result.shareCta,
                })
              }
            >
              <span className="hidden sm:inline">{dictionary.result.kakaoShare}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="px-3 sm:px-4"
            aria-label={dictionary.result.copyLink}
            title={dictionary.result.copyLink}
            icon={<Copy className="h-4 w-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(resultUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            <span className="hidden sm:inline">{copied ? dictionary.result.copied : dictionary.result.copyLink}</span>
          </Button>
          <Link href={`/${locale}`} aria-label={dictionary.result.retryAnalysis}>
            <Button
              variant="ghost"
              className="px-3 sm:px-4"
              aria-label={dictionary.result.retryAnalysis}
              title={dictionary.result.retryAnalysis}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">{dictionary.result.retryAnalysis}</span>
            </Button>
          </Link>
          <FeedbackButton reportId={reportId} locale={locale} />
        </div>
      </div>
      <div className="border-t border-border/70 bg-black/24 px-4 py-2 sm:px-8 sm:py-3">
        <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border border-accent-info/20 bg-accent-info/8 px-3 py-1.5 text-xs font-black text-text-primary shadow-[0_0_32px_rgb(125_216_255_/_0.08)] sm:px-4 sm:py-2 sm:text-sm">
          <Clock3 className="h-3.5 w-3.5 text-accent-info sm:h-4 sm:w-4" />
          <span>{displayedExpiryText}</span>
        </div>
      </div>
    </header>
  );
}
