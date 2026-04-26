"use client";

export function stopGlobalCameraStream() {
  const stream = window.__aiFaceReportStream;
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  window.__aiFaceReportStream = null;
}
