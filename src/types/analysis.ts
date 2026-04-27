import { z } from "zod";

export type Gender = "male" | "female";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ForeheadClassification = "narrow" | "average" | "wide";

export interface FaceMetrics {
  asymmetryIndex: number;
  phiRatioCompliance: number;
  thirds: { upper: number; middle: number; lower: number };
  fifths: number[];
  faceAspectRatio: number;
  eyeSpacing: number;
  facialAngleDeg: number;
  forehead: { areaPct: number; brow: number; classification: ForeheadClassification };
  eyes: { leftToRightDeltaMm: number; outerCantalAngleDeg: number };
  nose: { lengthMm: number; widthMm: number; columellaAngleDeg: number };
  mouth: { upperLowerLipRatio: number; philtrumRatioPct: number; cornerAngleDeg: number };
  jaw: { vlineIndex: number; chinProtrusionMm: number; cheekToJawRatio: number };
  faceBox: FaceBox;
}

export const reportSectionsSchema = z.object({
  meta: z.object({
    reportId: z.string(),
    confidence: z.number().min(0).max(100),
    complianceText: z.string(),
  }),
  geometry: z.object({
    asymmetry: z.string(),
    phi: z.string(),
    thirds: z.string(),
    fifths: z.string(),
    faceAspect: z.string(),
  }),
  parts: z.object({
    forehead: z.object({ metricsText: z.string(), comment: z.string() }),
    eyes: z.object({ metricsText: z.string(), comment: z.string() }),
    nose: z.object({ metricsText: z.string(), comment: z.string() }),
    mouth: z.object({ metricsText: z.string(), comment: z.string() }),
    jaw: z.object({ metricsText: z.string(), comment: z.string() }),
    skin: z.object({ observation: z.string(), comment: z.string() }),
  }),
  scores: z.object({
    likability: z.number().min(0).max(100),
    trust: z.number().min(0).max(100),
    symmetry: z.number().min(0).max(100),
    balance: z.number().min(0).max(100),
    attractiveness: z.number().min(0).max(100),
    comments: z.array(z.string()).min(5).max(5),
  }),
  impression: z.object({
    keywords: z.array(z.string()).min(3).max(5),
    estimatedAge: z.number(),
    estimatedAgeReal: z.number(),
    ageBucket: z.enum(["under_35", "over_35"]),
    physiognomy: z.string(),
  }),
  conclusion: z.string(),
  mainCopy: z.string(),
});

export type AgeBucket = "under_35" | "over_35";

export type ReportSections = z.infer<typeof reportSectionsSchema>;

export type AnalysisJobStatus = "queued" | "processing" | "retrying" | "complete" | "failed";
export type LegacyAnalysisJobStatus = "analyzing";
export type FaceReportStatus = AnalysisJobStatus | LegacyAnalysisJobStatus;

export interface FaceReportRow {
  id: string;
  created_at: string;
  expires_at: string;
  gender: Gender;
  status: FaceReportStatus;
  face_image_path: string | null;
  landmarks_json: Landmark[] | null;
  metrics_json: FaceMetrics | null;
  report_sections_json: ReportSections | null;
  main_copy: string | null;
  live_feed_json: string[];
  user_agent: string | null;
  ip_hash: string | null;
  age_bucket: AgeBucket | null;
  attempt_count?: number | null;
  model_used?: string | null;
  last_error?: string | null;
  retry_after?: string | null;
  locked_until?: string | null;
  processing_started_at?: string | null;
  heartbeat_at?: string | null;
  completed_at?: string | null;
}

export interface ClientLivenessSignal {
  variance: number;
  sampleCount: number;
}

export interface AnalyzeRequestBody {
  gender: Gender;
  metrics: FaceMetrics;
  landmarks?: Landmark[];
  imageBase64: string;
  clientSessionId?: string;
  deviceId?: string;
  liveness?: ClientLivenessSignal;
}

export interface AnalyzeStartResponse {
  reportId: string;
  status: Extract<AnalysisJobStatus, "queued" | "processing" | "retrying">;
  message: string;
}

export type AnalyzeStatusResponse =
  | {
      reportId: string;
      status: Extract<FaceReportStatus, "queued" | "processing" | "retrying" | "analyzing">;
      message: string;
      retryAfter: string | null;
      attemptCount: number;
      modelUsed: string | null;
    }
  | {
      reportId: string;
      status: "complete";
      message: string;
      sections: ReportSections;
      modelUsed: string | null;
    }
  | {
      reportId: string;
      status: "failed";
      message: string;
      retryAfter: string | null;
      attemptCount: number;
      modelUsed: string | null;
    };
