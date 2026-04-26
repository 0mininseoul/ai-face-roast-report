"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_SIZE = 72;
const MIN_FONT_SIZE = 28;

export function MainCopy({ text }: { text: string }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [fit, setFit] = useState({ fontSize: 56, scaleX: 1 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    const fitText = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      textNode.style.fontSize = `${MAX_FONT_SIZE}px`;
      textNode.style.transform = "scaleX(1)";
      const maxTextWidth = textNode.scrollWidth || availableWidth;
      const nextFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.floor((MAX_FONT_SIZE * availableWidth) / maxTextWidth)));

      textNode.style.fontSize = `${nextFontSize}px`;
      const fittedWidth = textNode.scrollWidth || availableWidth;
      const nextScaleX = Math.min(1, availableWidth / fittedWidth);
      setFit({ fontSize: nextFontSize, scaleX: nextScaleX });
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text]);

  return (
    <section ref={containerRef} className="w-full px-[clamp(18px,3vw,56px)] pb-12 pt-16 text-center">
      <h1 className="mx-auto w-full overflow-visible whitespace-nowrap text-center font-black leading-none tracking-normal text-text-primary">
        <span
          ref={textRef}
          className="inline-block whitespace-nowrap"
          style={{ fontSize: fit.fontSize, transform: `scaleX(${fit.scaleX})`, transformOrigin: "center" }}
        >
          {text}
        </span>
      </h1>
    </section>
  );
}
