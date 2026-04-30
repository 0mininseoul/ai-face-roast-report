"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { KakaoIcon } from "@/components/ui/KakaoIcon";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { loadKakaoSdk, shareKakaoFeed } from "@/lib/kakao/share";
import { OG_IMAGE_PATH } from "@/lib/siteMetadata";

const DEFAULT_URL = "https://faceroast.vercel.app";

export function PcUrlCopy({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const [pcUrl, setPcUrl] = useState(DEFAULT_URL);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    setPcUrl(window.location.origin);
    void loadKakaoSdk().then(setKakaoReady);
  }, []);

  const shareKakao = () => {
    shareKakaoFeed({
      title: dictionary.brand.title,
      description: dictionary.mobile.shareDescription,
      imageUrl: `${pcUrl}${OG_IMAGE_PATH}`,
      resultUrl: `${pcUrl}/${locale}`,
      buttonTitle: dictionary.result.shareCta,
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
          aria-label={dictionary.mobile.sendKakao}
          title={kakaoReady ? dictionary.mobile.sendKakao : dictionary.result.kakaoUnavailable}
          icon={<KakaoIcon className="h-4 w-4 rounded-[4px]" />}
          onClick={shareKakao}
        >
          {dictionary.mobile.send}
        </Button>
      </div>
    </div>
  );
}
