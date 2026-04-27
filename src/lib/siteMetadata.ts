import type { Metadata } from "next";

export const SITE_TITLE = "AI 얼평보고서";
export const SITE_DESCRIPTION = "Forensic-grade facial diagnostics. Powered by AI.";
export const RESULT_TITLE = "AI 얼평보고서 결과";
export const RESULT_DESCRIPTION = "AI 얼굴 분석 결과 - 이 페이지는 생성 후 24시간 뒤 사라집니다.";
export const OG_IMAGE_PATH = "/og-image.jpg";
export const OG_IMAGE_ALT = "AI 얼평보고서 오픈그래프 이미지";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function absoluteUrl(path: string, baseUrl: string) {
  return new URL(path, baseUrl).toString();
}

export function socialImage(baseUrl: string) {
  const imageUrl = absoluteUrl(OG_IMAGE_PATH, baseUrl);

  return {
    url: imageUrl,
    secureUrl: imageUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: OG_IMAGE_ALT,
    type: "image/jpeg",
  };
}

export function socialMetadata({
  baseUrl,
  path = "/",
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
}: {
  baseUrl: string;
  path?: string;
  title?: string;
  description?: string;
}): Metadata {
  const url = absoluteUrl(path, baseUrl);
  const image = socialImage(baseUrl);

  return {
    metadataBase: new URL(baseUrl),
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_TITLE,
      images: [image],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
