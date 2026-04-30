import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ManualAnalysisClient } from "@/components/manual-analysis/ManualAnalysisClient";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "이미지 업로드 분석 - AI 얼평보고서",
  description: "사진을 업로드해 AI 얼평보고서를 생성합니다.",
};

export default function PublicManualAnalysisPage() {
  noStore();
  return <ManualAnalysisClient locale={DEFAULT_LOCALE} />;
}
