import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ManualAnalysisClient } from "./ManualAnalysisClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "수동 이미지 분석 - AI 얼평보고서",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ManualAnalysisPage() {
  noStore();
  return <ManualAnalysisClient />;
}
