"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFaceLandmarker, type FaceLandmarkerDelegate, type FaceLandmarkerResult } from "@/lib/facemesh/faceLandmarker";
import type { Landmark } from "@/types/analysis";

export function useFaceLandmarker(videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean, options?: { delegate?: FaceLandmarkerDelegate }) {
  const rafRef = useRef<number | null>(null);
  const [result, setResult] = useState<FaceLandmarkerResult | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const delegate = options?.delegate ?? "GPU";

  const tick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const landmarker = await getFaceLandmarker(delegate);
    const next = landmarker.detectForVideo(video, performance.now());
    setResult(next);
    const first = next.faceLandmarks?.[0];
    setLandmarks(first ? first.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })) : null);
    rafRef.current = requestAnimationFrame(tick);
  }, [delegate, videoRef]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setResult(null);
    setLandmarks(null);
    getFaceLandmarker(delegate)
      .then(() => {
        if (cancelled) return;
        setIsLoading(false);
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setIsLoading(false));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [delegate, enabled, tick]);

  return { result, landmarks, isLoading };
}
