"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { AnalysisCard } from "@/components/analyze/AnalysisCard";
import { CardConnectors } from "@/components/analyze/CardConnectors";
import { ControlBar } from "@/components/analyze/ControlBar";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { Button } from "@/components/ui/Button";
import {
  COLLECTION_TIMEOUT_MS,
  LONG_WAIT_MS,
  TARGET_SAMPLE_COUNT,
  appendLandmarkSample,
  canStartAnalysis,
  sampleProgressBucket,
  type AnalysisTrigger,
} from "@/lib/analysis/sampling";
import { MIN_LANDMARK_VARIANCE, computeLivenessSignal, isLivenessAcceptable } from "@/lib/analysis/liveness";
import { getAnalysisProgress } from "@/lib/analysis/progress";
import { captureVideoFrame, downloadElementScreenshot, uploadDiagnosticVideoFrame } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import type { FaceLandmarkerDelegate } from "@/lib/facemesh/faceLandmarker";
import { setMuted as setGlobalMuted } from "@/lib/sound/sfx";
import { getClientDeviceId, getClientSessionId, logClientEvent } from "@/lib/telemetry/client";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import type { Gender, Landmark, ReportSections } from "@/types/analysis";

const LOADING_CARD_REVEAL_INTERVAL_MS = 1450;
const RESULT_CARD_REVEAL_INTERVAL_MS = 2600;
const ANALYSIS_CAPTURE_SETTLE_MS = 800;
const LIVENESS_WARNING_MS = 3500;
const ZERO_SAMPLE_CPU_FALLBACK_MS = 12_000;
const ZERO_SAMPLE_FAIL_MS = 24_000;
const LANDMARK_LOSS_RESET_MS = 1_500;
const LIVENESS_WARNING_TEXT = "카메라 앞에서 얼굴을 살짝 움직여 주세요";
type CardSide = "left" | "right";
type ConnectorPoint = { x: number; y: number };

export default function AnalyzePage() {
  return (
    <Suspense fallback={<AnalyzeFallback />}>
      <AnalyzeClient />
    </Suspense>
  );
}

function AnalyzeFallback() {
  return (
    <main className="grid h-screen place-items-center bg-black text-text-muted">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Loader2 className="h-4 w-4 animate-spin text-accent-info" />
        분석 화면 준비 중
      </div>
    </main>
  );
}

function AnalyzeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gender = searchParams.get("gender") as Gender | null;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const faceVisibleRef = useRef(false);
  const firstLandmarkLoggedRef = useRef(false);
  const lastSampleLogRef = useRef(0);
  const longWaitLoggedRef = useRef(false);
  const zeroSampleFallbackLoggedRef = useRef(false);
  const zeroSampleFailureLoggedRef = useRef(false);
  const cpuFallbackRecoveredLoggedRef = useRef(false);
  const diagnosticCaptureSentRef = useRef(false);
  const sampleCollectionStartedAtRef = useRef<number | null>(null);
  const lastLandmarksSeenAtRef = useRef<number | null>(null);
  const lastLandmarkLostLogRef = useRef(0);
  const landmarkLossCountRef = useRef(0);
  const livenessWarningUntilRef = useRef(0);
  const reportIdRef = useRef<string | null>(null);
  const sampleRef = useRef<Landmark[][]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [loadingRevealCount, setLoadingRevealCount] = useState(1);
  const [completedRevealCount, setCompletedRevealCount] = useState(0);
  const [expandedCardKeys, setExpandedCardKeys] = useState<Set<string>>(() => new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [connectorSources, setConnectorSources] = useState<Record<string, ConnectorPoint>>({});
  const [muted, setMuted] = useState(false);
  const [faceWarning, setFaceWarning] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [faceLandmarkerDelegate, setFaceLandmarkerDelegate] = useState<FaceLandmarkerDelegate>("GPU");
  const { videoRef, streamRef, status, error, start } = useCamera({ persistGlobal: true });
  const { result, landmarks, isLoading } = useFaceLandmarker(videoRef, status === "ready", { delegate: faceLandmarkerDelegate });
  const logEvent = useCallback((eventName: string, payload?: Record<string, unknown>, reportId?: string | null, level: "debug" | "info" | "warn" | "error" = "info") => {
    logClientEvent({ eventName, payload, reportId: reportId ?? reportIdRef.current, level });
  }, []);
  const faceDetectionDiagnostics = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current ?? (typeof window !== "undefined" ? window.__aiFaceReportStream : null);
    const track = stream?.getVideoTracks()[0] ?? null;

    return {
      cameraStatus: status,
      detectorDelegate: faceLandmarkerDelegate,
      videoReadyState: video?.readyState ?? null,
      videoWidth: video?.videoWidth ?? null,
      videoHeight: video?.videoHeight ?? null,
      videoPaused: video?.paused ?? null,
      videoEnded: video?.ended ?? null,
      trackReadyState: track?.readyState ?? null,
      trackMuted: track?.muted ?? null,
      trackEnabled: track?.enabled ?? null,
      trackWidth: track?.getSettings().width ?? null,
      trackHeight: track?.getSettings().height ?? null,
      trackFps: track?.getSettings().frameRate ?? null,
      sampleCount: sampleRef.current.length,
    };
  }, [faceLandmarkerDelegate, status, streamRef, videoRef]);
  const handleAnalysisEvent = useCallback(
    (eventName: string, payload?: Record<string, unknown>, reportId?: string | null) => {
      if (reportId) reportIdRef.current = reportId;
      logEvent(eventName, payload, reportId);
    },
    [logEvent],
  );
  const { state, start: startAnalysis } = useAnalysisStream({ onEvent: handleAnalysisEvent });
  const uploadDiagnosticFrame = useCallback(
    (eventName: string, payload?: Record<string, unknown>) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      void uploadDiagnosticVideoFrame(video, {
        eventName,
        sessionId: getClientSessionId(),
        reportId: reportIdRef.current,
        payload: {
          ...(payload ?? {}),
          ...faceDetectionDiagnostics(),
        },
      });
    },
    [faceDetectionDiagnostics, videoRef],
  );

  useEffect(() => {
    if (gender !== "male" && gender !== "female") router.replace("/");
  }, [gender, router]);

  useEffect(() => {
    if (!gender) return;
    logEvent("analyze_page_opened", { gender });
  }, [gender, logEvent]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    logEvent("camera_status_changed", { status, hasError: Boolean(error) }, null, status === "error" ? "warn" : "info");
  }, [error, logEvent, status]);

  useEffect(() => {
    if (status !== "ready") return;
    logEvent(isLoading ? "facemesh_model_loading" : "facemesh_model_ready", { status });
  }, [isLoading, logEvent, status]);

  const beginAnalysis = useCallback(
    async (samples: Landmark[][], trigger: AnalysisTrigger) => {
      if (!gender || startedRef.current || status !== "ready" || !videoRef.current || !canStartAnalysis(samples.length, trigger)) return false;

      const selectedSamples = samples.slice(-TARGET_SAMPLE_COUNT);
      logEvent("face_sample_collection_complete", { trigger, sampleCount: selectedSamples.length });
      setClientError(null);
      setSampleCount(selectedSamples.length);
      reportIdRef.current = null;
      startedRef.current = true;

      try {
        const liveness = computeLivenessSignal(selectedSamples);
        if (!isLivenessAcceptable(liveness)) {
          startedRef.current = false;
          logEvent(
            "analysis_client_liveness_blocked",
            {
              variance: liveness.variance,
              threshold: MIN_LANDMARK_VARIANCE,
              sampleCount: liveness.sampleCount,
            },
            null,
            "warn",
          );
          setSampleCount(0);
          sampleRef.current = [];
          sampleCollectionStartedAtRef.current = Date.now();
          livenessWarningUntilRef.current = Date.now() + LIVENESS_WARNING_MS;
          setFaceWarning(LIVENESS_WARNING_TEXT);
          return false;
        }

        const landmarkLossCountAtSettleStart = landmarkLossCountRef.current;
        logEvent("analysis_capture_settle_started", { delayMs: ANALYSIS_CAPTURE_SETTLE_MS, trigger, sampleCount: selectedSamples.length });
        await delay(ANALYSIS_CAPTURE_SETTLE_MS);

        const video = videoRef.current;
        if (!video || video.readyState < 2 || !faceVisibleRef.current || landmarkLossCountRef.current !== landmarkLossCountAtSettleStart) {
          startedRef.current = false;
          sampleRef.current = [];
          sampleCollectionStartedAtRef.current = Date.now();
          setSampleCount(0);
          setFaceWarning("얼굴이 잘 보이도록 자세를 잡아주세요");
          logEvent("analysis_capture_settle_lost_face", { delayMs: ANALYSIS_CAPTURE_SETTLE_MS, trigger }, null, "warn");
          return false;
        }

        const settledSamples = sampleRef.current.length > 0 ? sampleRef.current.slice(-TARGET_SAMPLE_COUNT) : selectedSamples;
        const averaged = averageLandmarks(settledSamples);
        const metrics = computeFaceMetrics(averaged);
        const imageBase64 = captureVideoFrame(video, 1280, 720, 0.85);
        logEvent("analysis_client_payload_ready", {
          trigger,
          sampleCount: settledSamples.length,
          initialSampleCount: selectedSamples.length,
          captureSettleMs: ANALYSIS_CAPTURE_SETTLE_MS,
          gender,
          livenessVariance: liveness.variance,
        });
        void startAnalysis({
          gender,
          metrics,
          landmarks: averaged,
          imageBase64,
          clientSessionId: getClientSessionId(),
          deviceId: getClientDeviceId(),
          liveness,
        }).catch((caught) => {
          const message = caught instanceof Error ? caught.message : "분석 요청 실패";
          logEvent("analysis_client_request_failed", { message }, null, "error");
          setClientError(message);
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "얼굴 좌표 계산 실패";
        logEvent("analysis_client_prepare_failed", { message }, null, "error");
        setClientError("얼굴 좌표 계산 중 오류가 발생했습니다. 처음으로 돌아가 다시 시도해 주세요.");
      }

      return true;
    },
    [gender, logEvent, startAnalysis, status, videoRef],
  );

  useEffect(() => {
    if (!landmarks) {
      const now = Date.now();
      const lastSeenAt = lastLandmarksSeenAtRef.current;
      const lostForMs = lastSeenAt ? now - lastSeenAt : Number.POSITIVE_INFINITY;
      if (faceVisibleRef.current && shouldLogLandmarkLost(lastLandmarkLostLogRef.current)) {
        lastLandmarkLostLogRef.current = Date.now();
        logEvent("face_landmarks_lost", { lostForMs, sampleCount: sampleRef.current.length }, null, "info");
      }

      if (lastSeenAt && lostForMs < LANDMARK_LOSS_RESET_MS) {
        setFaceWarning("얼굴 추적이 흔들립니다");
        return;
      }

      if (faceVisibleRef.current) landmarkLossCountRef.current += 1;
      faceVisibleRef.current = false;
      sampleRef.current = [];
      setSampleCount(0);
      lastSampleLogRef.current = 0;
      setFaceWarning("얼굴이 잘 보이도록 자세를 잡아주세요");
      return;
    }

    const faceCount = result?.faceLandmarks?.length ?? 1;
    const nextSamples = appendLandmarkSample(sampleRef.current, landmarks);
    const livenessWarning = Date.now() < livenessWarningUntilRef.current ? LIVENESS_WARNING_TEXT : null;
    lastLandmarksSeenAtRef.current = Date.now();
    faceVisibleRef.current = true;
    lastLandmarkLostLogRef.current = 0;
    sampleRef.current = nextSamples;
    setSampleCount(nextSamples.length);
    setFaceWarning(faceCount > 1 ? "가장 큰 얼굴 1개만 분석합니다" : livenessWarning);

    if (zeroSampleFallbackLoggedRef.current && faceLandmarkerDelegate === "CPU" && !cpuFallbackRecoveredLoggedRef.current) {
      cpuFallbackRecoveredLoggedRef.current = true;
      logEvent("face_landmarker_cpu_fallback_recovered", { ...faceDetectionDiagnostics(), sampleCount: nextSamples.length });
    }

    if (!firstLandmarkLoggedRef.current) {
      firstLandmarkLoggedRef.current = true;
      logEvent("face_landmarks_detected", { faceCount, sampleCount: nextSamples.length });
    }

    const sampleBucket = sampleProgressBucket(nextSamples.length);
    if (sampleBucket > 0 && sampleBucket !== lastSampleLogRef.current) {
      lastSampleLogRef.current = sampleBucket;
      logEvent("face_sample_collection_progress", { sampleCount: nextSamples.length, targetSampleCount: TARGET_SAMPLE_COUNT });
    }

    if (canStartAnalysis(nextSamples.length, "target_samples")) {
      void beginAnalysis(nextSamples, "target_samples");
    }
  }, [beginAnalysis, faceDetectionDiagnostics, faceLandmarkerDelegate, landmarks, logEvent, result]);

  useEffect(() => {
    if (status !== "ready") {
      sampleCollectionStartedAtRef.current = null;
      return;
    }
    if (startedRef.current || clientError) return;

    if (!sampleCollectionStartedAtRef.current) {
      sampleCollectionStartedAtRef.current = Date.now();
      longWaitLoggedRef.current = false;
      logEvent("face_sample_collection_started", { targetSampleCount: TARGET_SAMPLE_COUNT, fallbackAfterMs: COLLECTION_TIMEOUT_MS });
    }

    const interval = window.setInterval(() => {
      if (startedRef.current) {
        window.clearInterval(interval);
        return;
      }

      const elapsedMs = Date.now() - (sampleCollectionStartedAtRef.current ?? Date.now());
      const samples = sampleRef.current;
      if (samples.length === 0 && elapsedMs >= ZERO_SAMPLE_CPU_FALLBACK_MS && faceLandmarkerDelegate === "GPU" && !zeroSampleFallbackLoggedRef.current) {
        zeroSampleFallbackLoggedRef.current = true;
        setFaceWarning("얼굴 인식 엔진을 재시작하고 있습니다");
        logEvent("face_landmarker_cpu_fallback_started", { ...faceDetectionDiagnostics(), elapsedMs, targetSampleCount: TARGET_SAMPLE_COUNT }, null, "warn");
        if (!diagnosticCaptureSentRef.current) {
          diagnosticCaptureSentRef.current = true;
          uploadDiagnosticFrame("face_landmarker_cpu_fallback_started", { elapsedMs, targetSampleCount: TARGET_SAMPLE_COUNT });
        }
        setFaceLandmarkerDelegate("CPU");
        return;
      }

      if (samples.length === 0 && elapsedMs >= ZERO_SAMPLE_FAIL_MS && faceLandmarkerDelegate === "CPU" && !zeroSampleFailureLoggedRef.current) {
        zeroSampleFailureLoggedRef.current = true;
        window.clearInterval(interval);
        logEvent("face_sample_collection_failed_no_landmarks", { ...faceDetectionDiagnostics(), elapsedMs, targetSampleCount: TARGET_SAMPLE_COUNT }, null, "error");
        if (!diagnosticCaptureSentRef.current) {
          diagnosticCaptureSentRef.current = true;
          uploadDiagnosticFrame("face_sample_collection_failed_no_landmarks", { elapsedMs, targetSampleCount: TARGET_SAMPLE_COUNT });
        }
        setClientError("카메라 영상에서 얼굴을 인식하지 못했습니다. 얼굴이 화면 중앙에 보이도록 하고, 조명을 밝게 한 뒤 다시 시도해 주세요.");
        return;
      }

      if (elapsedMs >= COLLECTION_TIMEOUT_MS && canStartAnalysis(samples.length, "timeout_fallback")) {
        logEvent("face_sample_collection_timeout_fallback", { elapsedMs, sampleCount: samples.length, targetSampleCount: TARGET_SAMPLE_COUNT }, null, "warn");
        void beginAnalysis(samples, "timeout_fallback");
        return;
      }

      if (elapsedMs >= LONG_WAIT_MS && !longWaitLoggedRef.current) {
        longWaitLoggedRef.current = true;
        logEvent("face_sample_collection_waiting_long", { ...faceDetectionDiagnostics(), elapsedMs, sampleCount: samples.length, targetSampleCount: TARGET_SAMPLE_COUNT }, null, "warn");
        if (!diagnosticCaptureSentRef.current) {
          diagnosticCaptureSentRef.current = true;
          uploadDiagnosticFrame("face_sample_collection_waiting_long", { elapsedMs, sampleCount: samples.length, targetSampleCount: TARGET_SAMPLE_COUNT });
        }
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [beginAnalysis, clientError, faceDetectionDiagnostics, faceLandmarkerDelegate, logEvent, status, uploadDiagnosticFrame]);

  const progress = useMemo(
    () =>
      getAnalysisProgress({
        cameraStatus: status,
        isModelLoading: isLoading,
        hasStarted: startedRef.current,
        sampleCount,
        rawChars: state.raw.length,
        hasReportId: Boolean(state.reportId),
        jobStatus: state.jobStatus,
        pollCount: state.pollCount,
        isComplete: state.isComplete,
      }),
    [isLoading, sampleCount, state.isComplete, state.jobStatus, state.pollCount, state.raw.length, state.reportId, status],
  );
  const cards = useMemo(() => buildCards(state.sections), [state.sections]);
  const loadingCards = useMemo(() => buildCards(null), []);

  useEffect(() => {
    setExpandedCardKeys(new Set());
  }, [state.reportId]);

  useEffect(() => {
    if (state.sections) return;
    setCompletedRevealCount(0);
    setLoadingRevealCount(1);
    const interval = window.setInterval(() => {
      setLoadingRevealCount((count) => Math.min(loadingCards.length, count + 1));
    }, LOADING_CARD_REVEAL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadingCards.length, state.reportId, state.sections]);

  useEffect(() => {
    if (state.sections) return;
    const latestIndex = loadingRevealCount - 1;
    const latestCard = loadingCards[latestIndex];
    if (!latestCard) return;
    setExpandedCardKeys((previous) => new Set(previous).add(latestCard.key));
  }, [loadingCards, loadingRevealCount, state.sections]);

  useEffect(() => {
    if (!state.sections) return;
    setCompletedRevealCount(0);
    setExpandedCardKeys(new Set());

    const first = window.setTimeout(() => setCompletedRevealCount(1), 520);
    const interval = window.setInterval(() => {
      setCompletedRevealCount((count) => Math.min(cards.length, count + 1));
    }, RESULT_CARD_REVEAL_INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [cards.length, state.reportId, state.sections]);

  useEffect(() => {
    if (!state.sections || completedRevealCount <= 0) return;
    const focusIndex = completedRevealCount - 1;
    const focusCard = cards[focusIndex];
    if (!focusCard) return;

    setExpandedCardKeys((previous) => new Set(previous).add(focusCard.key));
  }, [cards, completedRevealCount, state.sections]);

  const isFatal = status === "denied" || status === "error" || Boolean(state.error) || Boolean(clientError);
  const visibleCount = state.sections
    ? Math.min(cards.length, Math.max(Math.min(loadingRevealCount, cards.length - 1), completedRevealCount))
    : Math.min(loadingCards.length, loadingRevealCount);
  const visibleCards = useMemo(() => cards.slice(0, visibleCount), [cards, visibleCount]);
  const visibleItems = useMemo(
    () =>
      visibleCards.map((card, index) => ({
        card,
        index,
        isCompletedCard: Boolean(state.sections && index < completedRevealCount),
        loadingCard: loadingCards[index],
      })),
    [completedRevealCount, loadingCards, state.sections, visibleCards],
  );
  const leftItems = useMemo(() => visibleItems.filter((item) => item.card.key !== "conclusion" && getCardSide(item.index) === "left"), [visibleItems]);
  const rightItems = useMemo(() => visibleItems.filter((item) => item.card.key !== "conclusion" && getCardSide(item.index) === "right"), [visibleItems]);
  const conclusionItem = useMemo(() => visibleItems.find((item) => item.card.key === "conclusion"), [visibleItems]);
  const handleToggleCard = useCallback((key: string, isExpanded: boolean) => {
    setExpandedCardKeys((previous) => {
      const next = new Set(previous);
      if (isExpanded) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const connectorCards = useMemo(() => visibleItems.map((item) => ({ key: item.card.key, index: item.index, active: expandedCardKeys.has(item.card.key) })), [expandedCardKeys, visibleItems]);
  const railBottom = conclusionItem ? 176 : 28;

  const measureConnectorSources = useCallback(() => {
    const next: Record<string, ConnectorPoint> = {};
    for (const item of visibleItems) {
      const node = cardRefs.current[item.card.key];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const isConclusion = item.card.key === "conclusion";
      const side = getCardSide(item.index);
      const xPx = isConclusion ? rect.left + rect.width / 2 : side === "left" ? rect.right : rect.left;
      const yPx = isConclusion ? rect.top : rect.top + Math.min(rect.height * 0.5, 58);
      next[item.card.key] = {
        x: (xPx / window.innerWidth) * 100,
        y: (yPx / window.innerHeight) * 100,
      };
    }
    setConnectorSources((previous) => (areConnectorSourcesEqual(previous, next) ? previous : next));
  }, [visibleItems]);

  useEffect(() => {
    measureConnectorSources();
    const frame = window.requestAnimationFrame(measureConnectorSources);
    const settled = window.setTimeout(measureConnectorSources, 380);
    const observer = new ResizeObserver(measureConnectorSources);
    for (const item of visibleItems) {
      const node = cardRefs.current[item.card.key];
      if (node) observer.observe(node);
    }
    window.addEventListener("resize", measureConnectorSources);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      observer.disconnect();
      window.removeEventListener("resize", measureConnectorSources);
    };
  }, [expandedCardKeys, measureConnectorSources, progress.percent, visibleCount, visibleItems]);

  const connectorCardsWithSources = connectorCards.map((connector) => ({
    ...connector,
    source: connectorSources[connector.key] ?? null,
  }));

  return (
    <main ref={rootRef} className="relative h-screen overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-85" muted playsInline />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0,transparent_22%,rgb(0_0_0_/_0.32)_62%,rgb(0_0_0_/_0.72)_100%)]" />
      <FaceMeshOverlay result={result} />
      <CardConnectors connectors={connectorCardsWithSources} />
      <ControlBar
        muted={muted}
        onMutedChange={(next) => {
          setMuted(next);
          setGlobalMuted(next);
        }}
        onScreenshot={() => {
          if (rootRef.current) void downloadElementScreenshot(rootRef.current);
        }}
      />

      <div className="fixed left-7 top-6 z-20 flex items-center gap-2 rounded-lg border border-border bg-black/45 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted backdrop-blur">
        <Image src="/brand/logo.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md border border-white/10 object-cover" />
        <span>AI 얼평보고서 / LIVE ANALYSIS</span>
      </div>

      {faceWarning && !isFatal && (
        <div className="fixed left-1/2 top-7 z-30 -translate-x-1/2 rounded-md border border-accent-warn/40 bg-black/55 px-4 py-2 text-sm font-semibold text-accent-warn backdrop-blur">
          {faceWarning}
        </div>
      )}

      {!isFatal && !state.sections && (
        <AnalysisStatusPanel percent={progress.percent} label={state.statusMessage ?? progress.label} text="현재 촬영 프레임과 얼굴 랜드마크를 기준으로 분석 파이프라인을 진행 중입니다." />
      )}

      {!isFatal && state.sections && <AnalysisNotice text={state.sections.meta.complianceText} />}

      <div className="fixed left-6 top-[92px] z-20 w-[min(620px,36vw)] space-y-2 overflow-y-auto pr-1" style={{ bottom: railBottom }} onScroll={measureConnectorSources}>
        {leftItems.map((item) => {
          const isExpanded = expandedCardKeys.has(item.card.key);
          return (
            <div key={item.card.key} ref={(node) => { cardRefs.current[item.card.key] = node; }}>
              <AnalysisCard
                title={item.card.title}
                text={item.isCompletedCard ? item.card.text : item.loadingCard?.text ?? "분석 대기 중입니다."}
                isStreaming={!item.isCompletedCard}
                expanded={isExpanded}
                progressPercent={!item.isCompletedCard ? getCardProgress(progress.percent, item.index) : undefined}
                progressLabel={!item.isCompletedCard ? item.loadingCard?.text : undefined}
                onToggle={() => handleToggleCard(item.card.key, isExpanded)}
              >
                {item.isCompletedCard && item.card.key === "scores" && state.sections ? <ScoreCardContent sections={state.sections} /> : null}
              </AnalysisCard>
            </div>
          );
        })}
      </div>

      <div className="fixed right-6 top-[92px] z-20 w-[min(620px,36vw)] space-y-2 overflow-y-auto pl-1" style={{ bottom: railBottom }} onScroll={measureConnectorSources}>
        {rightItems.map((item) => {
          const isExpanded = expandedCardKeys.has(item.card.key);
          return (
            <div key={item.card.key} ref={(node) => { cardRefs.current[item.card.key] = node; }}>
              <AnalysisCard
                title={item.card.title}
                text={item.isCompletedCard ? item.card.text : item.loadingCard?.text ?? "분석 대기 중입니다."}
                isStreaming={!item.isCompletedCard}
                expanded={isExpanded}
                progressPercent={!item.isCompletedCard ? getCardProgress(progress.percent, item.index) : undefined}
                progressLabel={!item.isCompletedCard ? item.loadingCard?.text : undefined}
                onToggle={() => handleToggleCard(item.card.key, isExpanded)}
              >
                {item.isCompletedCard && item.card.key === "scores" && state.sections ? <ScoreCardContent sections={state.sections} /> : null}
              </AnalysisCard>
            </div>
          );
        })}
      </div>

      {conclusionItem && (
        <div ref={(node) => { cardRefs.current[conclusionItem.card.key] = node; }} className="fixed bottom-8 left-1/2 z-30 w-[min(980px,72vw)] -translate-x-1/2">
          <AnalysisCard
            title={conclusionItem.card.title}
            text={conclusionItem.isCompletedCard ? conclusionItem.card.text : conclusionItem.loadingCard?.text ?? "최종 결론을 구성 중입니다."}
            tone="verdict"
            isStreaming={!conclusionItem.isCompletedCard}
            expanded={expandedCardKeys.has(conclusionItem.card.key)}
            className="border-accent-bad/35"
            onToggle={() => handleToggleCard(conclusionItem.card.key, expandedCardKeys.has(conclusionItem.card.key))}
            action={
              conclusionItem.isCompletedCard && state.reportId ? (
                <Button className="w-full justify-center" icon={<ArrowRight className="h-4 w-4" />} onClick={() => router.replace(`/result/${state.reportId}`)}>
                  결과 페이지로 이동
                </Button>
              ) : null
            }
          />
        </div>
      )}

      {isFatal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/78">
          <div className="glass-panel max-w-lg rounded-2xl p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-accent-bad" />
            <h1 className="mt-5 text-2xl font-extrabold">분석을 진행할 수 없습니다</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">{clientError ?? state.error ?? error ?? "카메라 접근을 확인해 주세요."}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button icon={<RefreshCcw className="h-4 w-4" />} onClick={() => window.location.reload()}>
                다시 시도
              </Button>
              <Button variant="ghost" onClick={() => router.push("/")}>
                처음으로
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function AnalysisStatusPanel({ percent, label, text }: { percent: number; label: string; text: string }) {
  return (
    <div className="fixed bottom-8 left-7 z-20 w-[min(390px,calc(100vw-3.5rem))] rounded-xl border border-border bg-black/50 px-4 py-4 text-sm font-semibold text-text-muted shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-info" />
          <span>{label}</span>
        </div>
        <span className="text-2xl font-black tabular-nums text-text-primary">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-xs font-medium leading-5 text-text-faint">{text}</p>
    </div>
  );
}

function AnalysisNotice({ text }: { text: string }) {
  return (
    <div className="fixed bottom-8 left-7 z-20 flex w-[min(460px,calc(100vw-3.5rem))] items-start gap-3 rounded-xl border border-border bg-black/38 px-4 py-3 text-xs font-medium leading-5 text-text-faint backdrop-blur">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-info" />
      <p>{text}</p>
    </div>
  );
}

function getCardSide(index: number): CardSide {
  return index % 2 === 0 ? "left" : "right";
}

function getCardProgress(globalPercent: number, index: number) {
  const value = globalPercent - index * 4 + 8;
  return Math.max(7, Math.min(96, value));
}

function shouldLogLandmarkLost(lastLoggedAt: number) {
  return lastLoggedAt === 0 || Date.now() - lastLoggedAt >= 10_000;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function areConnectorSourcesEqual(previous: Record<string, ConnectorPoint>, next: Record<string, ConnectorPoint>) {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => {
    const before = previous[key];
    const after = next[key];
    if (!before || !after) return false;
    return Math.abs(before.x - after.x) < 0.04 && Math.abs(before.y - after.y) < 0.04;
  });
}

function ScoreCardContent({ sections }: { sections: ReportSections }) {
  const rows = [
    { label: "호감도", value: sections.scores.likability, comment: sections.scores.comments[0] },
    { label: "신뢰도", value: sections.scores.trust, comment: sections.scores.comments[1] },
    { label: "대칭성", value: sections.scores.symmetry, comment: sections.scores.comments[2] },
    { label: "균형감", value: sections.scores.balance, comment: sections.scores.comments[3] },
    { label: "매력도", value: sections.scores.attractiveness, comment: sections.scores.comments[4] },
  ];

  return (
    <div className="max-h-[250px] space-y-3 overflow-y-auto pr-1">
      {rows.map((row) => {
        const value = Math.max(0, Math.min(100, row.value));
        return (
          <div key={row.label} className="rounded-lg border border-white/10 bg-black/24 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-text-muted">{row.label}</span>
              <span className="text-lg font-black tabular-nums text-text-primary">{Math.round(value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent-bad" style={{ width: `${value}%` }} />
            </div>
            {row.comment && <p className="mt-2 text-xs font-medium leading-5 text-text-muted">{row.comment}</p>}
          </div>
        );
      })}
    </div>
  );
}

function buildCards(sections: ReportSections | null) {
  const cards = [
    { key: "geometry", title: "§1 FACIAL GEOMETRY", text: sections ? Object.values(sections.geometry).join(" ") : "안면 대칭, 황금비, 삼정/오관 비율을 산출 중입니다." },
    { key: "forehead", title: "§2 FOREHEAD", text: sections ? `${sections.parts.forehead.metricsText} ${sections.parts.forehead.comment}` : "이마 면적과 미간, 헤어라인 비율을 추적 중입니다." },
    { key: "eyes", title: "§2 EYES", text: sections ? `${sections.parts.eyes.metricsText} ${sections.parts.eyes.comment}` : "좌우 눈 크기 차이와 눈꼬리 각도를 비교 중입니다." },
    { key: "nose", title: "§2 NOSE", text: sections ? `${sections.parts.nose.metricsText} ${sections.parts.nose.comment}` : "콧대 길이와 콧방울 너비를 계측 중입니다." },
    { key: "mouth", title: "§2 MOUTH", text: sections ? `${sections.parts.mouth.metricsText} ${sections.parts.mouth.comment}` : "입술 두께비와 입꼬리 각도를 분석 중입니다." },
    { key: "jaw", title: "§2 JAW", text: sections ? `${sections.parts.jaw.metricsText} ${sections.parts.jaw.comment}` : "턱끝 돌출도와 광대-턱 비율을 계산 중입니다." },
    { key: "skin", title: "§2 SKIN", text: sections ? `${sections.parts.skin.observation} ${sections.parts.skin.comment}` : "피부 결, 혈색, 광택 정보를 시각 관찰 중입니다." },
    {
      key: "scores",
      title: "§3 AESTHETIC INDEX",
      text: sections
        ? `호감도 ${sections.scores.likability}, 신뢰도 ${sections.scores.trust}, 대칭성 ${sections.scores.symmetry}, 균형감 ${sections.scores.balance}, 매력도 ${sections.scores.attractiveness}. ${sections.scores.comments.join(" ")}`
        : "종합 미관 지표 게이지를 낮은 기대값으로 보정 중입니다.",
    },
    { key: "impression", title: "§4 IMPRESSION", text: sections ? `${sections.impression.keywords.join(", ")}. ${sections.impression.physiognomy}` : "인상 키워드와 관상학적 소견을 구성 중입니다." },
  ];

  if (sections) {
    cards.push({ key: "conclusion", title: "§5 FINAL ASSESSMENT", text: sections.conclusion });
  }

  return cards;
}
