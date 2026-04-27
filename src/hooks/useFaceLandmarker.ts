"use client";

import { useEffect, useRef, useState } from "react";
import { getFaceImageLandmarker, getFaceLandmarker, type FaceLandmarkerDelegate, type FaceLandmarkerResult } from "@/lib/facemesh/faceLandmarker";
import type { Landmark } from "@/types/analysis";

const IMAGE_FALLBACK_INTERVAL_MS = 400;
const PRESERVE_FALLBACK_RESULT_MS = 1_000;

export type FaceDetectionSource = "video" | "image_fallback";

function toLandmarks(result: FaceLandmarkerResult): Landmark[] | null {
  const first = result.faceLandmarks?.[0];
  return first ? first.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })) : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Face landmarker failed";
}

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
  options?: { delegate?: FaceLandmarkerDelegate; imageFallback?: boolean; imageFallbackAfterMs?: number },
) {
  const rafRef = useRef<number | null>(null);
  const [result, setResult] = useState<FaceLandmarkerResult | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [detectionSource, setDetectionSource] = useState<FaceDetectionSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const delegate = options?.delegate ?? "GPU";
  const imageFallback = options?.imageFallback ?? false;
  const imageFallbackAfterMs = options?.imageFallbackAfterMs ?? 6_000;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let emptySince: number | null = null;
    let lastImageFallbackAt = 0;
    let lastDetectionAt = 0;

    const scheduleNext = (tick: () => void) => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(tick);
    };

    setIsLoading(true);
    setResult(null);
    setLandmarks(null);
    setDetectionSource(null);
    setError(null);
    getFaceLandmarker(delegate)
      .then((landmarker) => {
        if (cancelled) return;
        setIsLoading(false);

        const tick = async () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            scheduleNext(tick);
            return;
          }

          try {
            const videoResult = landmarker.detectForVideo(video, performance.now());
            let nextResult = videoResult;
            let nextLandmarks = toLandmarks(videoResult);
            let nextSource: FaceDetectionSource | null = nextLandmarks ? "video" : null;
            const now = Date.now();

            if (!nextLandmarks) {
              emptySince ??= now;
              const canTryImageFallback =
                imageFallback && now - emptySince >= imageFallbackAfterMs && now - lastImageFallbackAt >= IMAGE_FALLBACK_INTERVAL_MS;

              if (canTryImageFallback) {
                lastImageFallbackAt = now;
                const imageLandmarker = await getFaceImageLandmarker("CPU");
                if (cancelled) return;
                const imageResult = imageLandmarker.detect(video);
                const fallbackLandmarks = toLandmarks(imageResult);
                if (fallbackLandmarks) {
                  nextResult = imageResult;
                  nextLandmarks = fallbackLandmarks;
                  nextSource = "image_fallback";
                }
              }
            }

            if (cancelled) return;
            if (nextLandmarks) {
              emptySince = null;
              lastDetectionAt = Date.now();
              setResult(nextResult);
              setLandmarks(nextLandmarks);
              setDetectionSource(nextSource);
            } else if (!imageFallback || Date.now() - lastDetectionAt > PRESERVE_FALLBACK_RESULT_MS) {
              setResult(videoResult);
              setLandmarks(null);
              setDetectionSource(null);
            }
            setError(null);
          } catch (caught) {
            if (!cancelled) {
              setError(errorMessage(caught));
              setResult(null);
              setLandmarks(null);
              setDetectionSource(null);
            }
          }

          scheduleNext(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((caught) => {
        if (cancelled) return;
        setIsLoading(false);
        setError(errorMessage(caught));
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [delegate, enabled, imageFallback, imageFallbackAfterMs, videoRef]);

  return { result, landmarks, detectionSource, isLoading, error };
}
