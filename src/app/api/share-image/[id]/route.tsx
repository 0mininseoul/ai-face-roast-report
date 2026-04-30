import { ImageResponse } from "next/og";
import { backfillStoredReportSections } from "@/lib/analysis/reportBackfill";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { getDictionary } from "@/lib/i18n/dictionary";
import { normalizeLocale } from "@/lib/i18n/locales";
import { getServerSupabase } from "@/lib/supabase/server";
import { reportSectionsSchema, type FaceReportRow } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("face_reports").select("*").eq("id", params.id).single();
  if (error || !data) return new Response("Not found", { status: 404 });

  const row = data as FaceReportRow;
  const locale = normalizeLocale(row.locale);
  const dictionary = getDictionary(locale);
  if (new Date(row.expires_at).getTime() <= Date.now()) return new Response("Not found", { status: 404 });
  if (row.status !== "complete" || !row.face_image_path || !row.report_sections_json) return new Response("Not found", { status: 404 });

  const sections = postprocessReportSections(reportSectionsSchema.parse(backfillStoredReportSections(row.report_sections_json)), {
    gender: row.gender,
    tone: row.analysis_tone ?? "roast",
    locale,
  });
  const mainCopy = normalizeShareCopy(row.main_copy?.trim() || sections.mainCopy || dictionary.brand.resultTitle);
  const { data: faceBlob, error: faceError } = await supabase.storage.from("face-images").download(row.face_image_path);
  if (faceError || !faceBlob) return new Response("Not found", { status: 404 });

  const faceDataUrl = await blobToDataUrl(faceBlob);
  const imageFit = row.analysis_source === "manual_upload" ? "contain" : "cover";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #050609 0%, #10131b 54%, #050609 100%)",
          color: "#f5f7fb",
          fontFamily: "sans-serif",
          padding: 44,
        }}
      >
        <div
          style={{
            width: 452,
            height: 542,
            display: "flex",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 28,
            background: "#050609",
            boxShadow: "0 26px 90px rgba(0,0,0,0.42)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faceDataUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: imageFit,
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "10px 0 8px 46px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#7dd8ff",
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 5,
                textTransform: "uppercase",
              }}
            >
              AI FACE REPORT
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 34,
                fontSize: mainCopy.length > 34 ? 52 : 60,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: 0,
                wordBreak: "keep-all",
                textWrap: "balance",
              }}
            >
              {mainCopy}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              paddingTop: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 900 }}>{dictionary.brand.title}</div>
              <div style={{ display: "flex", marginTop: 8, color: "#a0a8b8", fontSize: 18, fontWeight: 700 }}>
                Forensic-grade facial diagnostics
              </div>
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(125,216,255,0.28)",
                borderRadius: 999,
                color: "#7dd8ff",
                fontSize: 17,
                fontWeight: 900,
                padding: "10px 16px",
              }}
            >
              {dictionary.result.shareCta}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const mimeType = blob.type || "image/jpeg";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function normalizeShareCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 72);
}
