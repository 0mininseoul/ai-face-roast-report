"use client";

import { toPng } from "html-to-image";

const CAPTURE_CLASS = "is-capturing";

export async function downloadElementScreenshot(element: HTMLElement, filenamePrefix = "ai-얼평보고서") {
  const cleanupVideo = prepareVideoCanvases(element);
  document.documentElement.classList.add(CAPTURE_CLASS);
  try {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const dataUrl = await toPng(element, {
      pixelRatio,
      backgroundColor: "#000000",
      filter: (node) => node.dataset?.capture !== "hide",
      imagePlaceholder:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      fetchRequestInit: { cache: "force-cache" },
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${filenamePrefix}-${Date.now()}.png`;
    link.click();
  } finally {
    document.documentElement.classList.remove(CAPTURE_CLASS);
    cleanupVideo();
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
  const replacements: Array<{ video: HTMLVideoElement; canvas: HTMLCanvasElement; nextSibling: ChildNode | null; parent: HTMLElement }> = [];

  root.querySelectorAll("video").forEach((video) => {
    if (!video.parentElement) return;
    const parent = video.parentElement;
    const rect = video.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const computed = window.getComputedStyle(video);

    const canvas = document.createElement("canvas");
    const drawWidth = Math.max(1, Math.round(rect.width));
    const drawHeight = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(drawWidth * scale);
    canvas.height = Math.round(drawHeight * scale);

    for (const cls of Array.from(video.classList)) canvas.classList.add(cls);
    canvas.style.position = computed.position === "static" ? "absolute" : computed.position;
    canvas.style.left = `${rect.left - parentRect.left}px`;
    canvas.style.top = `${rect.top - parentRect.top}px`;
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;
    canvas.style.opacity = computed.opacity;
    canvas.style.borderRadius = computed.borderRadius;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = computed.zIndex === "auto" ? "0" : computed.zIndex;
    canvas.style.transform = "none";

    const ctx = canvas.getContext("2d");
    const hasFrame = video.videoWidth > 0 && video.videoHeight > 0;
    if (ctx && hasFrame) {
      ctx.scale(scale, scale);
      drawVideoCover(ctx, video, drawWidth, drawHeight, isVideoMirrored(video, computed));
    } else if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    replacements.push({ video, canvas, nextSibling: video.nextSibling, parent });
    parent.replaceChild(canvas, video);
  });

  return () => {
    replacements.forEach(({ video, canvas, nextSibling, parent }) => {
      if (canvas.parentElement === parent) {
        parent.insertBefore(video, nextSibling);
        canvas.remove();
      }
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
