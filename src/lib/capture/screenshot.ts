"use client";

import html2canvas from "html2canvas";

export async function downloadElementScreenshot(element: HTMLElement, filenamePrefix = "ai-얼평보고서") {
  const cleanup = prepareVideoCanvases(element);
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      useCORS: true,
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${filenamePrefix}-${Date.now()}.png`;
    link.click();
  } finally {
    cleanup();
  }
}

export function captureVideoFrame(video: HTMLVideoElement, width = 1280, height = 720, quality = 0.85): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function prepareVideoCanvases(root: HTMLElement): () => void {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const replacements: Array<{ video: HTMLVideoElement; canvas: HTMLCanvasElement; visibility: string }> = [];

  root.querySelectorAll("video").forEach((video) => {
    if (!video.videoWidth || !video.videoHeight || !video.parentElement) return;

    const rect = video.getBoundingClientRect();
    const parentRect = video.parentElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const computed = window.getComputedStyle(video);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    canvas.style.position = "absolute";
    canvas.style.left = `${rect.left - parentRect.left}px`;
    canvas.style.top = `${rect.top - parentRect.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.opacity = computed.opacity;
    canvas.style.borderRadius = computed.borderRadius;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = computed.zIndex === "auto" ? "0" : computed.zIndex;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    drawVideoCover(ctx, video, rect.width, rect.height, isVideoMirrored(video, computed));

    replacements.push({ video, canvas, visibility: video.style.visibility });
    video.parentElement.appendChild(canvas);
    video.style.visibility = "hidden";
  });

  return () => {
    replacements.forEach(({ video, canvas, visibility }) => {
      video.style.visibility = visibility;
      canvas.remove();
    });
  };
}

function drawVideoCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, mirrored: boolean) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * coverScale;
  const drawHeight = sourceHeight * coverScale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.save();
  if (mirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function isVideoMirrored(video: HTMLVideoElement, computed: CSSStyleDeclaration) {
  return computed.transform.includes("-1") || video.className.toString().includes("scale-x-[-1]");
}
