import Link from "next/link";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DetailedReport } from "@/components/result/DetailedReport";
import { FaceImage } from "@/components/result/FaceImage";
import { MainCopy } from "@/components/result/MainCopy";
import { ResultHeader } from "@/components/result/ResultHeader";
import { StopCameraOnMount } from "@/components/result/StopCameraOnMount";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { absoluteUrl, OG_IMAGE_PATH, RESULT_DESCRIPTION, RESULT_TITLE, socialMetadata } from "@/lib/siteMetadata";
import { getRequestOrigin } from "@/lib/siteUrl";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow } from "@/types/analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    ...socialMetadata({
      baseUrl: getRequestOrigin(),
      path: `/result/${params.id}`,
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
  if (new Date(row.expires_at).getTime() <= Date.now()) redirect("/result/expired");
  if (row.status === "analyzing") return <PendingResultPage />;
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) notFound();

  const sections = reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json));
  const { data: signed } = await supabase.storage.from("face-images").createSignedUrl(row.face_image_path, 60 * 60 * 24);
  const faceUrl = signed?.signedUrl ?? "";
  const baseUrl = getRequestOrigin();
  const resultUrl = `${baseUrl}/result/${row.id}`;
  const shareImageUrl = absoluteUrl(OG_IMAGE_PATH, baseUrl);
  const mainCopy = row.main_copy ?? sections.mainCopy;

  return (
    <main className="min-h-screen">
      <StopCameraOnMount />
      <ResultHeader shareImageUrl={shareImageUrl} resultUrl={resultUrl} reportId={row.id} />
      <MainCopy text={mainCopy} />
      <FaceImage src={faceUrl} createdAt={row.created_at} />
      <DetailedReport sections={sections} />
    </main>
  );
}

function PendingResultPage() {
  return (
    <main className="grid min-h-screen place-items-center px-8">
      <meta httpEquiv="refresh" content="3" />
      <section className="glass-panel max-w-xl rounded-2xl p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">Analysis in progress</p>
        <h1 className="mt-3 text-3xl font-black">보고서를 생성 중입니다</h1>
        <p className="mt-4 leading-7 text-text-muted">잠시 후 자동으로 다시 확인합니다. 완료 전 링크를 열어도 더 이상 404로 고정되지 않습니다.</p>
        <Link className="mt-8 inline-block" href="">
          <Button>다시 확인</Button>
        </Link>
      </section>
    </main>
  );
}

function backfillStoredReportSections(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;

  const report = input as Record<string, unknown>;
  const impression = report.impression;
  if (!impression || typeof impression !== "object" || Array.isArray(impression)) return input;

  const nextImpression = { ...impression } as Record<string, unknown>;
  const estimatedAge = typeof nextImpression.estimatedAge === "number" ? nextImpression.estimatedAge : null;
  const estimatedAgeReal = typeof nextImpression.estimatedAgeReal === "number" ? nextImpression.estimatedAgeReal : estimatedAge;

  if (estimatedAgeReal !== null) {
    nextImpression.estimatedAgeReal = estimatedAgeReal;
  }

  if (nextImpression.ageBucket !== "under_35" && nextImpression.ageBucket !== "over_35" && estimatedAgeReal !== null) {
    nextImpression.ageBucket = estimatedAgeReal < 35 ? "under_35" : "over_35";
  }

  return { ...report, impression: nextImpression };
}
