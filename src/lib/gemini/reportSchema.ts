import { reportSectionsSchema, type ReportSections } from "@/types/analysis";

export const REPORT_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        report_id: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        compliance_text: { type: "string" },
      },
      required: ["report_id", "confidence", "compliance_text"],
    },
    geometry: {
      type: "object",
      properties: {
        asymmetry: { type: "string" },
        phi: { type: "string" },
        thirds: { type: "string" },
        fifths: { type: "string" },
        face_aspect: { type: "string" },
      },
      required: ["asymmetry", "phi", "thirds", "fifths", "face_aspect"],
    },
    parts: {
      type: "object",
      properties: {
        forehead: partSchema(),
        eyes: partSchema(),
        nose: partSchema(),
        mouth: partSchema(),
        jaw: partSchema(),
        skin: {
          type: "object",
          properties: {
            observation: { type: "string" },
            comment: { type: "string" },
          },
          required: ["observation", "comment"],
        },
      },
      required: ["forehead", "eyes", "nose", "mouth", "jaw", "skin"],
    },
    scores: {
      type: "object",
      properties: {
        likability: scoreSchema(),
        trust: scoreSchema(),
        symmetry: scoreSchema(),
        balance: scoreSchema(),
        attractiveness: scoreSchema(),
        comments: {
          type: "array",
          items: { type: "string" },
          minItems: 5,
          maxItems: 5,
        },
      },
      required: ["likability", "trust", "symmetry", "balance", "attractiveness", "comments"],
    },
    impression: {
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        estimated_age: { type: "number" },
        estimated_age_real: { type: "number" },
        age_bucket: { type: "string", enum: ["under_35", "over_35"] },
        physiognomy: { type: "string" },
      },
      required: ["keywords", "estimated_age", "estimated_age_real", "age_bucket", "physiognomy"],
    },
    conclusion: { type: "string" },
    mainCopy: { type: "string" },
  },
  required: ["meta", "geometry", "parts", "scores", "impression", "conclusion", "mainCopy"],
} as const;

function partSchema() {
  return {
    type: "object",
    properties: {
      metrics_text: { type: "string" },
      comment: { type: "string" },
    },
    required: ["metrics_text", "comment"],
  } as const;
}

function scoreSchema() {
  return { type: "number", minimum: 0, maximum: 100 } as const;
}

type GeminiReport = {
  meta: { report_id: string; confidence: number; compliance_text: string };
  geometry: { asymmetry: string; phi: string; thirds: string; fifths: string; face_aspect: string };
  parts: {
    forehead: { metrics_text: string; comment: string };
    eyes: { metrics_text: string; comment: string };
    nose: { metrics_text: string; comment: string };
    mouth: { metrics_text: string; comment: string };
    jaw: { metrics_text: string; comment: string };
    skin: { observation: string; comment: string };
  };
  scores: ReportSections["scores"];
  impression: {
    keywords: string[];
    estimated_age: number;
    estimated_age_real: number;
    age_bucket: "under_35" | "over_35";
    physiognomy: string;
  };
  conclusion: string;
  mainCopy: string;
};

export function normalizeGeminiReport(input: unknown): ReportSections {
  const raw = input as GeminiReport;
  return reportSectionsSchema.parse({
    meta: {
      reportId: raw.meta.report_id,
      confidence: raw.meta.confidence,
      complianceText: raw.meta.compliance_text,
    },
    geometry: {
      asymmetry: raw.geometry.asymmetry,
      phi: raw.geometry.phi,
      thirds: raw.geometry.thirds,
      fifths: raw.geometry.fifths,
      faceAspect: raw.geometry.face_aspect,
    },
    parts: {
      forehead: { metricsText: raw.parts.forehead.metrics_text, comment: raw.parts.forehead.comment },
      eyes: { metricsText: raw.parts.eyes.metrics_text, comment: raw.parts.eyes.comment },
      nose: { metricsText: raw.parts.nose.metrics_text, comment: raw.parts.nose.comment },
      mouth: { metricsText: raw.parts.mouth.metrics_text, comment: raw.parts.mouth.comment },
      jaw: { metricsText: raw.parts.jaw.metrics_text, comment: raw.parts.jaw.comment },
      skin: { observation: raw.parts.skin.observation, comment: raw.parts.skin.comment },
    },
    scores: raw.scores,
    impression: {
      keywords: raw.impression.keywords,
      estimatedAge: raw.impression.estimated_age,
      estimatedAgeReal: raw.impression.estimated_age_real,
      ageBucket: raw.impression.age_bucket,
      physiognomy: raw.impression.physiognomy,
    },
    conclusion: raw.conclusion,
    mainCopy: raw.mainCopy,
  });
}
