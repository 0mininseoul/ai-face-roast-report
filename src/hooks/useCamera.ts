"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

export function useCamera(options?: { persistGlobal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (typeof window !== "undefined" && window.__aiFaceReportStream === stream) {
        window.__aiFaceReportStream = null;
      }
    }
  }, []);

  const start = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (options?.persistGlobal) window.__aiFaceReportStream = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "카메라를 열 수 없습니다";
      setError(message);
      setStatus(message.toLowerCase().includes("permission") ? "denied" : "error");
    }
  }, [options?.persistGlobal]);

  useEffect(() => {
    return () => {
      if (!options?.persistGlobal) stop();
    };
  }, [options?.persistGlobal, stop]);

  return { videoRef, streamRef, status, error, start, stop };
}
