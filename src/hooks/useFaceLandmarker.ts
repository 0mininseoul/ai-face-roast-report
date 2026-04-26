"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFaceLandmarker, type FaceLandmarkerResult } from "@/lib/facemesh/faceLandmarker";
import type { Landmark } from "@/types/analysis";

export function useFaceLandmarker(videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean) {
  const rafRef = useRef<number | null>(null);
  const [result, setResult] = useState<FaceLandmarkerResult | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const landmarker = await getFaceLandmarker();
    const next = landmarker.detectForVideo(video, performance.now());
    setResult(next);
    const first = next.faceLandmarks?.[0];
    setLandmarks(first ? first.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })) : null);
    rafRef.current = requestAnimationFrame(tick);
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    getFaceLandmarker()
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
  }, [enabled, tick]);

  return { result, landmarks, isLoading };
}
