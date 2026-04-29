import type { Metadata } from "next";

export const SITE_TITLE = "AI 얼평보고서";
export const SITE_DESCRIPTION = "Forensic-grade facial diagnostics. Powered by AI.";
export const RESULT_TITLE = "AI 얼평보고서 결과";
export const RESULT_DESCRIPTION = "AI 얼굴 분석 결과 - 이 페이지는 생성 후 24시간 뒤 사라집니다.";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_ALT = "AI 얼평보고서 오픈그래프 이미지";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

type SocialImageOptions = {
  imageUrl?: string;
  imagePath?: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
  type?: string | null;
};

export function absoluteUrl(path: string, baseUrl: string) {
  return new URL(path, baseUrl).toString();
}

export function socialImage(baseUrl: string, options: SocialImageOptions = {}) {
  const imageUrl = options.imageUrl ?? absoluteUrl(options.imagePath ?? OG_IMAGE_PATH, baseUrl);
  const width = options.width === undefined ? OG_IMAGE_WIDTH : options.width;
  const height = options.height === undefined ? OG_IMAGE_HEIGHT : options.height;
  const type = options.type === undefined ? "image/png" : options.type;

  return {
    url: imageUrl,
    secureUrl: imageUrl,
    alt: options.alt ?? OG_IMAGE_ALT,
    ...(width === null ? {} : { width }),
    ...(height === null ? {} : { height }),
    ...(type === null ? {} : { type }),
  };
}

export function socialMetadata({
  baseUrl,
  path = "/",
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  imageUrl,
  imagePath,
  imageAlt,
  imageWidth,
  imageHeight,
  imageType,
}: {
  baseUrl: string;
  path?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageType?: string | null;
}): Metadata {
  const url = absoluteUrl(path, baseUrl);
  const image = socialImage(baseUrl, {
    imageUrl,
    imagePath,
    alt: imageAlt,
    width: imageWidth,
    height: imageHeight,
    type: imageType,
  });

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
