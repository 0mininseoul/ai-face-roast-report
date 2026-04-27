import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DetailedReport } from "@/components/result/DetailedReport";
import { FaceImage } from "@/components/result/FaceImage";
import { MainCopy } from "@/components/result/MainCopy";
import { Logo } from "@/components/ui/Logo";
import { backfillStoredReportSections } from "@/lib/analysis/reportBackfill";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow } from "@/types/analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "관리자 보고서 - AI 얼평보고서",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminFaceReportPage({ params }: { params: { id: string } }) {
  noStore();
  if (!isUuid(params.id)) notFound();

  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
  if (error || !data) notFound();

  const row = data as FaceReportRow;
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) notFound();

  const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), { gender: row.gender });
  const faceDataUrl = await downloadFaceImageDataUrl(supabase, row.face_image_path);
  const mainCopy = row.main_copy?.trim() || sections.mainCopy;

  return (
    <main className="min-h-screen">
      <AdminHeader row={row} />
      <MainCopy text={mainCopy} />
      <FaceImage src={faceDataUrl} createdAt={row.created_at} />
      <DetailedReport sections={sections} />
    </main>
  );
}

function AdminHeader({ row }: { row: FaceReportRow }) {
  return (
    <header className="border-b border-border bg-bg-primary/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <span className="rounded-md border border-accent-info/30 bg-accent-info/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-text-primary">
            Admin only
          </span>
        </div>
        <div className="grid gap-2 text-xs leading-5 text-text-muted sm:grid-cols-3">
          <AdminMeta label="Report ID" value={row.id} />
          <AdminMeta label="Created" value={formatKst(row.created_at)} />
          <AdminMeta label="Public expiry" value={formatKst(row.expires_at)} />
        </div>
      </div>
    </header>
  );
}

function AdminMeta({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0 rounded-lg border border-border bg-black/24 px-3 py-2">
      <span className="mr-2 font-black uppercase tracking-[0.12em] text-text-faint">{label}</span>
      <span className="break-words font-semibold text-text-primary">{value}</span>
    </p>
  );
}

async function downloadFaceImageDataUrl(supabase: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("face-images").download(path);
  if (error || !data) throw new Error(`Failed to download admin face image: ${error?.message ?? "missing data"}`);

  const mimeType = data.type || "image/jpeg";
  const buffer = Buffer.from(await data.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function formatKst(value: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
