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
import { backfillStoredReportSections } from "@/lib/analysis/reportBackfill";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedResultPath, normalizeLocale, type Locale } from "@/lib/i18n/locales";
import { absoluteUrl, RESULT_DESCRIPTION, RESULT_TITLE, socialMetadata } from "@/lib/siteMetadata";
import { getRequestOrigin } from "@/lib/siteUrl";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow, type FaceReportStatus } from "@/types/analysis";

export async function generateResultMetadata({
  id,
  searchParams,
  requestedLocale,
}: {
  id: string;
  searchParams?: { [key: string]: string | string[] | undefined };
  requestedLocale: Locale | null;
}): Promise<Metadata> {
  const baseUrl = getRequestOrigin();
  const shareQuery = typeof searchParams?.share === "string" ? `?share=${encodeURIComponent(searchParams.share)}` : "";
  const path = `${requestedLocale ? localizedResultPath(id, requestedLocale) : `/result/${id}`}${shareQuery}`;

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.from("face_reports").select("*").eq("id", id).single();
    if (!error && data) {
      const row = data as FaceReportRow;
      const locale = normalizeLocale(row.locale);
      const dictionary = getDictionary(locale);
      const isComplete = row.status === "complete" && row.face_image_path && row.report_sections_json && new Date(row.expires_at).getTime() > Date.now();
      if (isComplete) {
        const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), {
          gender: row.gender,
          tone: row.analysis_tone ?? "roast",
          locale,
        });
        const mainCopy = row.main_copy?.trim() || sections.mainCopy || dictionary.brand.resultTitle;
        const expiryText = row.analysis_source === "manual_upload" ? dictionary.result.expiry7 : dictionary.result.expiry24;
        return {
          ...socialMetadata({
            baseUrl,
            path: `${localizedResultPath(row.id, locale)}${shareQuery}`,
            locale,
            title: mainCopy,
            description: `${dictionary.metadata.resultDescriptionPrefix} - ${expiryText}`,
            imageUrl: absoluteUrl(`/api/share-face/${row.id}?v=kakao-v3`, baseUrl),
            imageAlt: mainCopy,
            imageWidth: null,
            imageHeight: null,
            imageType: null,
          }),
          title: dictionary.brand.resultTitle,
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
  return ResultPageContent({ id: params.id, requestedLocale: null });
}

export async function ResultPageContent({ id, requestedLocale }: { id: string; requestedLocale: Locale | null }) {
  noStore();

  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", id).single();
  if (error || !data) notFound();

  const row = data as FaceReportRow;
  const locale = normalizeLocale(row.locale);
  if (!requestedLocale || requestedLocale !== locale) redirect(localizedResultPath(row.id, locale));
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt <= Date.now()) notFound();
  if (isPendingResultStatus(row.status)) return <PendingResultPage status={row.status} retryAfter={row.retry_after ?? null} locale={locale} />;
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) notFound();

  const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), {
    gender: row.gender,
    tone: row.analysis_tone ?? "roast",
    locale,
  });
  const imageTtlSeconds = Math.max(1, Math.min(60 * 60 * 24, Math.floor((expiresAt - Date.now()) / 1000)));
  const { data: signed } = await supabase.storage.from("face-images").createSignedUrl(row.face_image_path, imageTtlSeconds);
  const faceUrl = signed?.signedUrl ?? "";
  const baseUrl = getRequestOrigin();
  const resultUrl = `${baseUrl}${localizedResultPath(row.id, locale)}`;
  const mainCopy = row.main_copy?.trim() || sections.mainCopy;
  const shareImageUrl = absoluteUrl(`/api/share-face/${row.id}?v=kakao-v3`, baseUrl);
  const shareResultUrl = `${resultUrl}?share=kakao-v3`;
  const isManualUpload = row.analysis_source === "manual_upload";
  const dictionary = getDictionary(locale);
  const expiryText = isManualUpload ? dictionary.result.expiry7 : dictionary.result.expiry24;

  return (
    <main className="min-h-screen">
      <StopCameraOnMount />
      <ResultHeader shareImageUrl={shareImageUrl} resultUrl={resultUrl} shareResultUrl={shareResultUrl} reportId={row.id} mainCopy={mainCopy} expiryText={expiryText} locale={locale} />
      <MainCopy text={mainCopy} />
      <FaceImage src={faceUrl} createdAt={row.created_at} fit={isManualUpload ? "contain" : "cover"} locale={locale} />
      <DetailedReport sections={sections} locale={locale} />
    </main>
  );
}

function PendingResultPage({ status, retryAfter, locale }: { status: FaceReportStatus; retryAfter: string | null; locale: Locale }) {
  const dictionary = getDictionary(locale);
  const message =
    status === "queued"
      ? dictionary.status.queued
      : status === "retrying"
        ? retryAfter
          ? dictionary.status.retryDelayed
          : dictionary.status.retryPreparing
        : dictionary.status.processing;

  return (
    <main className="grid min-h-screen place-items-center px-8">
      <meta httpEquiv="refresh" content="3" />
      <section className="glass-panel max-w-xl rounded-2xl p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo locale={locale} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">{dictionary.result.pendingBadge}</p>
        <h1 className="mt-3 text-3xl font-black">{dictionary.result.pendingTitle}</h1>
        <p className="mt-4 leading-7 text-text-muted">{message} {dictionary.result.pendingSuffix}</p>
        <Link className="mt-8 inline-block" href="">
          <Button>{dictionary.result.checkAgain}</Button>
        </Link>
      </section>
    </main>
  );
}

function isPendingResultStatus(status: FaceReportStatus): boolean {
  return status === "queued" || status === "processing" || status === "retrying" || status === "analyzing";
}
