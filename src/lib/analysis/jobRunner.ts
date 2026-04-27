import "server-only";

import { getGenAi, MODEL_ANALYSIS, MODEL_ANALYSIS_FALLBACK, MODEL_ANALYSIS_FAST } from "@/lib/gemini/client";
import { buildAnalysisModelChain } from "@/lib/gemini/modelSelection";
import { buildAnalyzeUserPrompt } from "@/lib/gemini/promptText";
import { readAnalyzeSystemPrompt } from "@/lib/gemini/prompts";
import { extractImageSource, normalizeGeminiReport, REPORT_RESPONSE_JSON_SCHEMA } from "@/lib/gemini/reportSchema";
import { pickMainCopy } from "@/lib/copy/mainCopy";
import { analysisErrorMessage, extractErrorText, isRetryableAnalysisError } from "@/lib/analysis/errors";
import { postprocessReportSections } from "@/lib/analysis/reportPostprocess";
import { getServerSupabase } from "@/lib/supabase/server";
import { logServiceEvent } from "@/lib/telemetry/server";
import type { AnalysisJobStatus, FaceReportRow, FaceReportStatus, ReportSections } from "@/types/analysis";

interface AnalysisJobContext {
  sessionId?: string | null;
  jobBudgetMs?: number | null;
}

interface ClaimedJobResult {
  completed: boolean;
  reportId: string | null;
  status: AnalysisJobStatus | "skipped";
}

export interface DrainAnalysisQueueResult {
  attempted: number;
  claimed: number;
  completed: number;
  failed: number;
  retrying: number;
  skipped: number;
  durationMs: number;
  remainingBudgetMs: number;
  results: ClaimedJobResult[];
}

const DEFAULT_MAX_CONCURRENT_ANALYSES = 2;
const DEFAULT_JOB_LOCK_SECONDS = 270;
const DEFAULT_JOB_BUDGET_MS = 270_000;
const DEFAULT_DRAIN_MAX_JOBS = 4;
const DEFAULT_DRAIN_BUDGET_MS = 240_000;
const DEFAULT_DRAIN_MIN_NEXT_JOB_BUDGET_MS = 45_000;
const DEFAULT_PRIMARY_TIMEOUT_MS = 75_000;
const DEFAULT_FALLBACK_TIMEOUT_MS = 55_000;
const DEFAULT_FAST_TIMEOUT_MS = 30_000;
const DEFAULT_PRIMARY_RETRY_ATTEMPTS = 2;
const DEFAULT_PRIMARY_RETRY_DELAY_MS = 8_000;

export async function drainAnalysisQueue({
  targetId = null,
  sessionId = null,
  maxJobs = intEnv("ANALYSIS_DRAIN_MAX_JOBS", DEFAULT_DRAIN_MAX_JOBS),
  budgetMs = intEnv("ANALYSIS_DRAIN_BUDGET_MS", DEFAULT_DRAIN_BUDGET_MS),
}: {
  targetId?: string | null;
  sessionId?: string | null;
  maxJobs?: number;
  budgetMs?: number;
} = {}): Promise<DrainAnalysisQueueResult> {
  const startedAt = Date.now();
  const safeMaxJobs = Math.max(1, Math.min(maxJobs, 10));
  const safeBudgetMs = Math.max(10_000, budgetMs);
  const results: ClaimedJobResult[] = [];

  await logServiceEvent({
    sessionId,
    reportId: targetId,
    eventName: "analysis_drain_started",
    phase: "server_worker",
    payload: { targetReportId: targetId, maxJobs: safeMaxJobs, budgetMs: safeBudgetMs },
  });

  let nextTargetId = targetId;
  for (let index = 0; index < safeMaxJobs; index += 1) {
    const remainingBudgetMs = safeBudgetMs - (Date.now() - startedAt);
    if (remainingBudgetMs < intEnv("ANALYSIS_DRAIN_MIN_NEXT_JOB_BUDGET_MS", DEFAULT_DRAIN_MIN_NEXT_JOB_BUDGET_MS)) break;

    const result = await processAnalysisJob(nextTargetId, {
      sessionId,
      jobBudgetMs: Math.max(10_000, remainingBudgetMs - 5_000),
    });
    results.push(result);
    nextTargetId = null;

    if (result.status === "skipped") break;
  }

  const summary = summarizeDrainResults(results, startedAt, safeBudgetMs);
  await logServiceEvent({
    sessionId,
    reportId: targetId,
    eventName: "analysis_drain_completed",
    phase: "server_worker",
    payload: {
      targetReportId: targetId,
      attempted: summary.attempted,
      claimed: summary.claimed,
      completed: summary.completed,
      failed: summary.failed,
      retrying: summary.retrying,
      skipped: summary.skipped,
      durationMs: summary.durationMs,
      remainingBudgetMs: summary.remainingBudgetMs,
    },
  });

  return summary;
}

export async function processAnalysisJob(reportId?: string | null, context: AnalysisJobContext = {}): Promise<ClaimedJobResult> {
  const row = await claimAnalysisJob(reportId ?? null);

  if (!row) {
    await logServiceEvent({
      sessionId: context.sessionId,
      reportId: reportId ?? null,
      eventName: "analysis_job_claim_skipped",
      phase: "server_worker",
      level: "debug",
      payload: { targetReportId: reportId ?? null },
    });
    return { completed: false, reportId: reportId ?? null, status: "skipped" };
  }

  await logServiceEvent({
    sessionId: context.sessionId,
    reportId: row.id,
    eventName: "analysis_job_claimed",
    phase: "server_worker",
    payload: {
      attemptCount: row.attempt_count ?? 0,
      maxConcurrent: intEnv("ANALYSIS_MAX_CONCURRENT", DEFAULT_MAX_CONCURRENT_ANALYSES),
    },
  });

  try {
    const result = await runClaimedAnalysisJob(row, context);
    return { completed: result === "complete", reportId: row.id, status: result };
  } catch (error) {
    await markJobFailed(row.id, error, row.model_used);
    await logServiceEvent({
      sessionId: context.sessionId,
      reportId: row.id,
      eventName: "analysis_job_failed_unhandled",
      phase: "server_worker",
      level: "error",
      payload: { message: analysisErrorMessage(error), providerMessage: extractErrorText(error) },
    });
    return { completed: false, reportId: row.id, status: "failed" };
  }
}

export function isPendingAnalysisStatus(status: FaceReportStatus): status is Extract<FaceReportStatus, "queued" | "processing" | "retrying" | "analyzing"> {
  return status === "queued" || status === "processing" || status === "retrying" || status === "analyzing";
}

export function shouldWakeAnalysisJob(row: FaceReportRow): boolean {
  if (row.status === "queued" || row.status === "analyzing") return true;
  if (row.status === "retrying") return !row.retry_after || new Date(row.retry_after).getTime() <= Date.now();
  if (row.status !== "processing") return false;
  return Boolean(row.locked_until && new Date(row.locked_until).getTime() <= Date.now());
}

export function analysisStatusMessage(row: Pick<FaceReportRow, "status" | "retry_after" | "model_used" | "last_error">): string {
  if (row.status === "complete") return "보고서 생성이 완료되었습니다.";
  if (row.status === "failed") return analysisErrorMessage(row.last_error ?? "analysis_failed");
  if (row.status === "queued") return "정밀 분석 대기열에서 순서를 기다리고 있습니다.";
  if (row.status === "retrying") {
    const retryAt = row.retry_after ? new Date(row.retry_after).getTime() : 0;
    if (retryAt > Date.now()) return "Pro 모델 응답이 지연되어 잠시 후 다시 시도합니다.";
    return "정밀 분석 재시도를 준비하고 있습니다.";
  }
  if (row.model_used === MODEL_ANALYSIS) return "Gemini Pro 정밀 분석을 진행 중입니다.";
  if (row.model_used) return "보조 분석 모델로 보고서 생성을 마무리하고 있습니다.";
  return "정밀 분석을 진행 중입니다.";
}

async function claimAnalysisJob(reportId: string | null): Promise<FaceReportRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc("claim_face_report_job", {
    target_id: reportId,
    max_running: intEnv("ANALYSIS_MAX_CONCURRENT", DEFAULT_MAX_CONCURRENT_ANALYSES),
    lock_seconds: intEnv("ANALYSIS_JOB_LOCK_SECONDS", DEFAULT_JOB_LOCK_SECONDS),
  });

  if (error) throw new Error(`Failed to claim analysis job: ${error.message}`);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return (rows[0] as FaceReportRow | undefined) ?? null;
}

async function runClaimedAnalysisJob(row: FaceReportRow, context: AnalysisJobContext): Promise<AnalysisJobStatus> {
  if (!row.metrics_json) throw new Error("Analysis job is missing metrics_json");
  if (!row.face_image_path) throw new Error("Analysis job is missing face_image_path");

  const supabase = getServerSupabase();
  const imageBase64 = await downloadFaceImage(row.face_image_path);
  const systemInstruction = await readAnalyzeSystemPrompt();
  const startedAt = Date.now();
  const jobBudgetMs = context.jobBudgetMs && context.jobBudgetMs > 0 ? context.jobBudgetMs : intEnv("ANALYSIS_JOB_BUDGET_MS", DEFAULT_JOB_BUDGET_MS);
  const modelChain = buildAnalysisModelChain({
    primaryModel: MODEL_ANALYSIS,
    fallbackModel: MODEL_ANALYSIS_FALLBACK,
    fastModel: MODEL_ANALYSIS_FAST,
  });
  const errors: unknown[] = [];

  await logServiceEvent({
    sessionId: context.sessionId,
    reportId: row.id,
    eventName: "analysis_job_started",
    phase: "server_worker",
    payload: {
      models: modelChain,
      attemptCount: row.attempt_count ?? 0,
      promptChars: systemInstruction.length,
    },
  });

  for (const [index, model] of modelChain.entries()) {
    const remainingBudgetMs = jobBudgetMs - (Date.now() - startedAt);
    if (remainingBudgetMs < 10_000) {
      errors.push(new Error("analysis_job_budget_exceeded"));
      break;
    }

    const timeoutMs = Math.min(modelTimeoutMs(model), remainingBudgetMs - 5_000);
    await supabase.from("face_reports").update({ model_used: model, heartbeat_at: new Date().toISOString() }).eq("id", row.id);
    await logServiceEvent({
      sessionId: context.sessionId,
      reportId: row.id,
      eventName: "analysis_ai_attempt_started",
      phase: "server_worker",
      payload: {
        model,
        attempt: index + 1,
        maxAttempts: modelChain.length,
        timeoutMs,
        remainingBudgetMs,
        claimAttemptCount: row.attempt_count ?? 0,
      },
    });

    try {
      const raw = await generateReportJson({
        model,
        systemInstruction,
        prompt: buildAnalyzeUserPrompt(row.gender, row.metrics_json, row.id),
        imageBase64,
        timeoutMs,
      });
      const rawJson = parseRawReportJson(raw);
      const imageSource = extractImageSource(rawJson);
      if (imageSource && imageSource !== "real_webcam") {
        await logServiceEvent({
          sessionId: context.sessionId,
          reportId: row.id,
          eventName: "analysis_non_live_input_detected",
          phase: "server_worker",
          level: "warn",
          payload: { model, imageSource },
        });
        throw new Error(`non_live_input:${imageSource}`);
      }
      const parsed = normalizeGeminiReport(rawJson);
      const sections = postprocessReportSections(
        {
          ...parsed,
          mainCopy: pickMainCopy(row.gender, parsed.impression.ageBucket, row.id),
        },
        { gender: row.gender },
      );
      await markJobComplete(row, sections, model);
      await logServiceEvent({
        sessionId: context.sessionId,
        reportId: row.id,
        eventName: "analysis_report_completed",
        phase: "server_worker",
        payload: {
          model,
          totalChars: raw.length,
          ageBucket: sections.impression.ageBucket,
          ageReal: parsed.impression.estimatedAgeReal,
        },
      });
      return "complete";
    } catch (error) {
      errors.push(error);
      if (isNonLiveInputError(error)) {
        await markJobFailed(row.id, error, model);
        return "failed";
      }
      const isPrimaryAttempt = index === 0 && model === MODEL_ANALYSIS;
      const hasMoreFallbackModels = index < modelChain.length - 1;
      const canRetryPrimaryLater =
        isPrimaryAttempt &&
        isRetryableAnalysisError(error) &&
        (row.attempt_count ?? 1) < intEnv("ANALYSIS_PRO_RETRY_ATTEMPTS", DEFAULT_PRIMARY_RETRY_ATTEMPTS);

      await logServiceEvent({
        sessionId: context.sessionId,
        reportId: row.id,
        eventName: canRetryPrimaryLater ? "analysis_pro_retry_scheduled" : "analysis_ai_attempt_failed",
        phase: "server_worker",
        level: canRetryPrimaryLater || hasMoreFallbackModels ? "warn" : "error",
        payload: {
          model,
          attempt: index + 1,
          maxAttempts: modelChain.length,
          message: analysisErrorMessage(error),
          providerMessage: extractErrorText(error),
          canRetryPrimaryLater,
          hasMoreFallbackModels,
          elapsedMs: Date.now() - startedAt,
        },
      });

      if (canRetryPrimaryLater) {
        await schedulePrimaryRetry(row.id, model, error);
        return "retrying";
      }
    }
  }

  const finalError = errors[errors.length - 1] ?? new Error("Unknown analysis error");
  await logServiceEvent({
    sessionId: context.sessionId,
    reportId: row.id,
    eventName: "analysis_report_failed",
    phase: "server_worker",
    level: "error",
    payload: { message: analysisErrorMessage(finalError), providerMessage: extractErrorText(finalError) },
  });
  await markJobFailed(row.id, finalError, row.model_used);
  return "failed";
}

async function generateReportJson({
  model,
  systemInstruction,
  prompt,
  imageBase64,
  timeoutMs,
}: {
  model: string;
  systemInstruction: string;
  prompt: string;
  imageBase64: string;
  timeoutMs: number;
}): Promise<string> {
  const abortController = new AbortController();
  const timeout = globalThis.setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const ai = getGenAi();
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: REPORT_RESPONSE_JSON_SCHEMA,
        temperature: 0.95,
        abortSignal: abortController.signal,
      },
    });
    const raw = response.text ?? "";
    if (!raw.trim()) throw new Error("Empty analysis response");
    return raw;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function downloadFaceImage(path: string): Promise<string> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.storage.from("face-images").download(path);
  if (error || !data) throw new Error(`Failed to download face image: ${error?.message ?? "missing data"}`);
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}

async function markJobComplete(row: FaceReportRow, sections: ReportSections, model: string) {
  const supabase = getServerSupabase();
  const ageBucket = sections.impression.ageBucket;
  const { error } = await supabase
    .from("face_reports")
    .update({
      status: "complete",
      report_sections_json: sections,
      main_copy: sections.mainCopy,
      age_bucket: ageBucket,
      model_used: model,
      last_error: null,
      retry_after: null,
      locked_until: null,
      heartbeat_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) throw new Error(`Failed to store completed report: ${error.message}`);
}

async function schedulePrimaryRetry(reportId: string, model: string, error: unknown) {
  const retryAfter = new Date(Date.now() + intEnv("ANALYSIS_PRO_RETRY_DELAY_MS", DEFAULT_PRIMARY_RETRY_DELAY_MS)).toISOString();
  const supabase = getServerSupabase();
  const { error: updateError } = await supabase
    .from("face_reports")
    .update({
      status: "retrying",
      retry_after: retryAfter,
      locked_until: null,
      heartbeat_at: new Date().toISOString(),
      model_used: model,
      last_error: truncateError(error),
    })
    .eq("id", reportId);

  if (updateError) throw new Error(`Failed to schedule analysis retry: ${updateError.message}`);
}

async function markJobFailed(reportId: string, error: unknown, model: string | null | undefined) {
  const supabase = getServerSupabase();
  await supabase
    .from("face_reports")
    .update({
      status: "failed",
      locked_until: null,
      heartbeat_at: new Date().toISOString(),
      model_used: model ?? null,
      last_error: truncateError(error),
    })
    .eq("id", reportId);
}

function isNonLiveInputError(error: unknown): boolean {
  return extractErrorText(error).toLowerCase().includes("non_live_input");
}

function parseRawReportJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function modelTimeoutMs(model: string): number {
  if (model === MODEL_ANALYSIS) return intEnv("ANALYSIS_PRO_TIMEOUT_MS", DEFAULT_PRIMARY_TIMEOUT_MS);
  if (model === MODEL_ANALYSIS_FALLBACK) return intEnv("ANALYSIS_FALLBACK_TIMEOUT_MS", DEFAULT_FALLBACK_TIMEOUT_MS);
  return intEnv("ANALYSIS_FAST_TIMEOUT_MS", DEFAULT_FAST_TIMEOUT_MS);
}

function truncateError(error: unknown): string {
  return extractErrorText(error).slice(0, 2000);
}

function summarizeDrainResults(results: ClaimedJobResult[], startedAt: number, budgetMs: number): DrainAnalysisQueueResult {
  const durationMs = Date.now() - startedAt;
  return {
    attempted: results.length,
    claimed: results.filter((result) => result.status !== "skipped").length,
    completed: results.filter((result) => result.status === "complete").length,
    failed: results.filter((result) => result.status === "failed").length,
    retrying: results.filter((result) => result.status === "retrying").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    durationMs,
    remainingBudgetMs: Math.max(0, budgetMs - durationMs),
    results,
  };
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
