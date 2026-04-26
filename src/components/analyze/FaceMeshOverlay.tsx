"use client";

import { useEffect, useRef } from "react";
import type { FaceLandmarkerResult } from "@/lib/facemesh/faceLandmarker";

const CONNECTIONS: Array<[number, number]> = [
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
  [33, 133],
  [133, 159],
  [159, 145],
  [145, 33],
  [362, 263],
  [263, 386],
  [386, 374],
  [374, 362],
  [61, 291],
  [291, 13],
  [13, 14],
  [14, 61],
  [1, 2],
  [49, 279],
];

export function FaceMeshOverlay({ result }: { result: FaceLandmarkerResult | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * window.devicePixelRatio);
    canvas.height = Math.floor(rect.height * window.devicePixelRatio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const landmarks = result?.faceLandmarks?.[0];
    if (!landmarks) return;

    ctx.strokeStyle = "rgba(125, 216, 255, 0.42)";
    ctx.lineWidth = 1;
    for (const [a, b] of CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo((1 - pa.x) * rect.width, pa.y * rect.height);
      ctx.lineTo((1 - pb.x) * rect.width, pb.y * rect.height);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(245, 247, 251, 0.46)";
    for (let index = 0; index < landmarks.length; index += 4) {
      const p = landmarks[index]!;
      ctx.beginPath();
      ctx.arc((1 - p.x) * rect.width, p.y * rect.height, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [result]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10" />;
}
