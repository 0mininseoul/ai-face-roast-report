"use client";

export function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return resolve(false);
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      return resolve(true);
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-kakao-sdk]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
        resolve(Boolean(window.Kakao));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";
    script.async = true;
    script.dataset.kakaoSdk = "true";
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(Boolean(window.Kakao));
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function shareKakaoFeed(params: { title: string; description: string; imageUrl: string; resultUrl: string; buttonTitle?: string }) {
  window.Kakao?.Share?.sendDefault({
    objectType: "feed",
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      link: {
        mobileWebUrl: params.resultUrl,
        webUrl: params.resultUrl,
      },
    },
    buttons: [
      {
        title: params.buttonTitle ?? "분석 보러가기",
        link: {
          mobileWebUrl: params.resultUrl,
          webUrl: params.resultUrl,
        },
      },
    ],
  });
}
