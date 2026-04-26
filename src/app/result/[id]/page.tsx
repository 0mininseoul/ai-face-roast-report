import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DetailedReport } from "@/components/result/DetailedReport";
import { FaceImage } from "@/components/result/FaceImage";
import { MainCopy } from "@/components/result/MainCopy";
import { ResultHeader } from "@/components/result/ResultHeader";
import { StopCameraOnMount } from "@/components/result/StopCameraOnMount";
import { pickMainCopy } from "@/lib/copy/mainCopy";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow } from "@/types/analysis";

export default async function ResultPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
  if (error || !data) notFound();

  const row = data as FaceReportRow;
  if (new Date(row.expires_at).getTime() <= Date.now()) redirect("/result/expired");
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) notFound();

  const sections = reportSectionsSchema.parse(row.report_sections_json);
  const { data: signed } = await supabase.storage.from("face-images").createSignedUrl(row.face_image_path, 60 * 60 * 24);
  const faceUrl = signed?.signedUrl ?? "";
  const baseUrl = getRequestOrigin();
  const resultUrl = `${baseUrl}/result/${row.id}`;
  const mainCopy = pickMainCopy(row.gender, row.id);

  return (
    <main className="min-h-screen">
      <StopCameraOnMount />
      <ResultHeader mainCopy={mainCopy} faceImageUrl={faceUrl} resultUrl={resultUrl} />
      <MainCopy text={mainCopy} />
      <FaceImage src={faceUrl} createdAt={row.created_at} />
      <DetailedReport sections={sections} />
    </main>
  );
}

function getRequestOrigin() {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit && !explicit.includes("localhost")) return explicit.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return explicit ?? "http://localhost:3000";
}
