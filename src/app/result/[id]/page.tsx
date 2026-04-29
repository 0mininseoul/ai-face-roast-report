import Link from "next/link";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { DetailedReport } from "@/components/result/DetailedReport";
import { FaceImage } from "@/components/result/FaceImage";
import { MainCopy } from "@/components/result/MainCopy";
import { ResultHeader } from "@/components/result/ResultHeader";
import { StopCameraOnMount } from "@/components/result/StopCameraOnMount";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { backfillStoredReportSections } from "@/lib/analysis/reportBackfill";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { absoluteUrl, RESULT_DESCRIPTION, RESULT_TITLE, socialMetadata } from "@/lib/siteMetadata";
import { getRequestOrigin } from "@/lib/siteUrl";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow, type FaceReportStatus } from "@/types/analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const baseUrl = getRequestOrigin();
  const shareQuery = typeof searchParams?.share === "string" ? `?share=${encodeURIComponent(searchParams.share)}` : "";
  const path = `/result/${params.id}${shareQuery}`;

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
    if (!error && data) {
      const row = data as FaceReportRow;
      const isComplete = row.status === "complete" && row.face_image_path && row.report_sections_json && new Date(row.expires_at).getTime() > Date.now();
      if (isComplete) {
        const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), {
          gender: row.gender,
          tone: row.analysis_tone ?? "roast",
        });
        const mainCopy = row.main_copy?.trim() || sections.mainCopy || RESULT_TITLE;
        const expiryText = row.analysis_source === "manual_upload" ? "이 페이지는 생성 후 7일 뒤 사라집니다." : "이 페이지는 생성 후 24시간 뒤 사라집니다.";
        return {
          ...socialMetadata({
            baseUrl,
            path,
            title: mainCopy,
            description: `AI 얼굴 분석 결과 - ${expiryText}`,
            imageUrl: absoluteUrl(`/api/share-image/${row.id}`, baseUrl),
            imageAlt: mainCopy,
          }),
          title: RESULT_TITLE,
        };
      }
    }
  } catch {
    // Fall back to the generic metadata below when a result is unavailable.
  }

  return {
    ...socialMetadata({
      baseUrl,
      path,
      title: RESULT_TITLE,
      description: RESULT_DESCRIPTION,
    }),
    title: RESULT_TITLE,
  };
}

export default async function ResultPage({ params }: { params: { id: string } }) {
  noStore();

  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
  if (error || !data) notFound();

  const row = data as FaceReportRow;
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt <= Date.now()) notFound();
  if (isPendingResultStatus(row.status)) return <PendingResultPage status={row.status} retryAfter={row.retry_after ?? null} />;
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) notFound();

  const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), {
    gender: row.gender,
    tone: row.analysis_tone ?? "roast",
  });
  const imageTtlSeconds = Math.max(1, Math.min(60 * 60 * 24, Math.floor((expiresAt - Date.now()) / 1000)));
  const { data: signed } = await supabase.storage.from("face-images").createSignedUrl(row.face_image_path, imageTtlSeconds);
  const faceUrl = signed?.signedUrl ?? "";
  const baseUrl = getRequestOrigin();
  const resultUrl = `${baseUrl}/result/${row.id}`;
  const mainCopy = row.main_copy?.trim() || sections.mainCopy;
  const shareImageUrl = absoluteUrl(`/api/share-image/${row.id}`, baseUrl);
  const shareResultUrl = `${resultUrl}?share=kakao-v2`;
  const isManualUpload = row.analysis_source === "manual_upload";
  const expiryText = isManualUpload ? "이 페이지는 생성 후 7일 뒤 사라집니다." : "이 페이지는 생성 후 24시간 뒤 사라집니다.";

  return (
    <main className="min-h-screen">
      <StopCameraOnMount />
      <ResultHeader shareImageUrl={shareImageUrl} resultUrl={resultUrl} shareResultUrl={shareResultUrl} reportId={row.id} mainCopy={mainCopy} expiryText={expiryText} />
      <MainCopy text={mainCopy} />
      <FaceImage src={faceUrl} createdAt={row.created_at} fit={isManualUpload ? "contain" : "cover"} />
      <DetailedReport sections={sections} />
    </main>
  );
}

function PendingResultPage({ status, retryAfter }: { status: FaceReportStatus; retryAfter: string | null }) {
  const message =
    status === "queued"
      ? "분석 대기열에서 순서를 기다리고 있습니다."
      : status === "retrying"
        ? retryAfter
          ? "Pro 모델 응답이 지연되어 잠시 후 다시 시도합니다."
          : "정밀 분석 재시도를 준비하고 있습니다."
        : "보고서 생성을 진행 중입니다.";

  return (
    <main className="grid min-h-screen place-items-center px-8">
      <meta httpEquiv="refresh" content="3" />
      <section className="glass-panel max-w-xl rounded-2xl p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">Analysis in progress</p>
        <h1 className="mt-3 text-3xl font-black">보고서를 생성 중입니다</h1>
        <p className="mt-4 leading-7 text-text-muted">{message} 잠시 후 자동으로 다시 확인합니다.</p>
        <Link className="mt-8 inline-block" href="">
          <Button>다시 확인</Button>
        </Link>
      </section>
    </main>
  );
}

function isPendingResultStatus(status: FaceReportStatus): boolean {
  return status === "queued" || status === "processing" || status === "retrying" || status === "analyzing";
}
