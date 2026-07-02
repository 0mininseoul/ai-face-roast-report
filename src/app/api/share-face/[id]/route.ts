import { getServerSupabase } from "@/lib/supabase/server";
import { hasPermanentShareImage } from "@/lib/analysis/permanentShareReports";
import type { FaceReportRow } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
  if (error || !data) return new Response("Not found", { status: 404 });

  const row = data as FaceReportRow;
  const canServeExpiredImage = hasPermanentShareImage(row.id);
  if (new Date(row.expires_at).getTime() <= Date.now() && !canServeExpiredImage) return new Response("Not found", { status: 404 });
  if (row.status !== "complete" || !row.face_image_path) return new Response("Not found", { status: 404 });

  const { data: faceBlob, error: faceError } = await supabase.storage.from("face-images").download(row.face_image_path);
  if (faceError || !faceBlob) return new Response("Not found", { status: 404 });

  return new Response(await faceBlob.arrayBuffer(), {
    headers: {
      "Cache-Control": canServeExpiredImage ? "public, max-age=86400, s-maxage=604800" : "public, max-age=300, s-maxage=300",
      "Content-Disposition": "inline",
      "Content-Type": faceBlob.type || "image/jpeg",
    },
  });
}
