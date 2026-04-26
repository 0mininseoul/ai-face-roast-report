"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AnalysisCard } from "@/components/analyze/AnalysisCard";
import { ControlBar } from "@/components/analyze/ControlBar";
import { FaceMeshOverlay } from "@/components/analyze/FaceMeshOverlay";
import { LiveFeed } from "@/components/analyze/LiveFeed";
import { Button } from "@/components/ui/Button";
import { captureVideoFrame, downloadElementScreenshot } from "@/lib/capture/screenshot";
import { averageLandmarks, computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { setMuted as setGlobalMuted, playSfx } from "@/lib/sound/sfx";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import type { Gender, Landmark, ReportSections } from "@/types/analysis";

const SECTION_ORDER = [
  "meta",
  "geometry",
  "forehead",
  "eyes",
  "nose",
  "mouth",
  "jaw",
  "skin",
  "scores",
  "impression",
  "conclusion",
] as const;

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
  const sampleRef = useRef<Landmark[][]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [liveComments, setLiveComments] = useState<string[]>([]);
  const [faceWarning, setFaceWarning] = useState<string | null>(null);
  const { videoRef, streamRef, status, error, start } = useCamera({ persistGlobal: true });
  const { result, landmarks, isLoading } = useFaceLandmarker(videoRef, status === "ready");
  const { state, start: startAnalysis } = useAnalysisStream();

  useEffect(() => {
    if (gender !== "male" && gender !== "female") router.replace("/");
  }, [gender, router]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (!landmarks) {
      setFaceWarning("얼굴이 잘 보이도록 자세를 잡아주세요");
      return;
    }
    setFaceWarning(result?.faceLandmarks && result.faceLandmarks.length > 1 ? "가장 큰 얼굴 1개만 분석합니다" : null);
    sampleRef.current = [...sampleRef.current.slice(-120), landmarks];
  }, [landmarks, result]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisibleCount((count) => Math.min(SECTION_ORDER.length, count + 1));
    }, 1150);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gender || startedRef.current || status !== "ready" || sampleRef.current.length < 24 || !videoRef.current) return;
    startedRef.current = true;
    const averaged = averageLandmarks(sampleRef.current);
    const metrics = computeFaceMetrics(averaged);
    const imageBase64 = captureVideoFrame(videoRef.current, 1280, 720, 0.85);
    void startAnalysis({ gender, metrics, landmarks: averaged, imageBase64 });
  }, [gender, startAnalysis, status, videoRef]);

  const cards = useMemo(() => buildCards(state.sections, state.raw), [state.raw, state.sections]);

  const requestLiveComment = useCallback(async () => {
    if (!gender || !state.reportId || !videoRef.current) return null;
    const imageBase64 = captureVideoFrame(videoRef.current, 640, 360, 0.72);
    const response = await fetch("/api/live-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: state.reportId, gender, imageBase64 }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { comment: string };
    return data.comment;
  }, [gender, state.reportId, videoRef]);

  useEffect(() => {
    if (!state.isComplete || liveComments.length >= 5) return;
    const delay = liveComments.length === 0 ? 900 : 6500;
    const timer = window.setTimeout(() => {
      requestLiveComment()
        .then((comment) => {
          if (!comment) return;
          playSfx("live_ping");
          setLiveComments((current) => [...current, comment]);
        })
        .catch(() => undefined);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [liveComments.length, requestLiveComment, state.isComplete]);

  useEffect(() => {
    if (!state.reportId || liveComments.length < 5) return;
    const timer = window.setTimeout(() => {
      router.push(`/result/${state.reportId}`);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [liveComments.length, router, state.reportId]);

  const isFatal = status === "denied" || status === "error" || Boolean(state.error);

  return (
    <main ref={rootRef} className="relative h-screen overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-85" muted playsInline />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0,transparent_22%,rgb(0_0_0_/_0.32)_62%,rgb(0_0_0_/_0.72)_100%)]" />
      <FaceMeshOverlay result={result} />
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

      {cards.slice(0, visibleCount).map((card, index) => {
        const isConclusion = card.key === "conclusion";
        const side = index % 2 === 0 ? "left-7" : "right-7";
        const top = 92 + Math.floor(index / 2) * 150;
        return (
          <div
            key={card.key}
            className={`fixed z-20 ${isConclusion ? "left-1/2 top-1/2 w-[min(760px,58vw)] -translate-x-1/2 -translate-y-1/2" : `${side} w-[min(390px,25vw)]`}`}
            style={isConclusion ? undefined : { top }}
          >
            <AnalysisCard title={card.title} text={card.text} tone={isConclusion ? "verdict" : "clinical"} isStreaming={state.isStreaming && index === visibleCount - 1} />
          </div>
        );
      })}

      <LiveFeed comments={liveComments} />

      {(status !== "ready" || isLoading || (!startedRef.current && !state.error)) && !isFatal && (
        <div className="fixed bottom-8 left-7 z-20 flex items-center gap-3 rounded-lg border border-border bg-black/45 px-4 py-3 text-sm font-semibold text-text-muted backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-accent-info" />
          {status !== "ready" ? "카메라 초기화 중" : isLoading ? "MediaPipe 모델 로딩 중" : "얼굴 안정 프레임 수집 중"}
        </div>
      )}

      {isFatal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/78">
          <div className="glass-panel max-w-lg rounded-2xl p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-accent-bad" />
            <h1 className="mt-5 text-2xl font-extrabold">분석을 진행할 수 없습니다</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">{state.error ?? error ?? "카메라 접근을 확인해 주세요."}</p>
            <Button className="mt-6" onClick={() => router.push("/")}>
              처음으로
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function buildCards(sections: ReportSections | null, raw: string) {
  const streamText = raw ? `Gemini 응답 수신 중... ${raw.length.toLocaleString()} bytes 누적.` : "랜드마크 안정화 및 캡쳐 프레임을 기준으로 분석을 준비 중입니다.";
  const cards = [
    {
      key: "meta",
      title: "§0 ANALYSIS METADATA",
      text: sections ? `REPORT #${sections.meta.reportId}. Confidence ${sections.meta.confidence}%. ${sections.meta.complianceText}` : streamText,
    },
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
