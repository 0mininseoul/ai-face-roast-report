"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_SIZE = 64;
const MIN_FONT_SIZE = 18;

export function MainCopy({ text }: { text: string }) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [fit, setFit] = useState({ fontSize: MAX_FONT_SIZE, scaleX: 1 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    const fitText = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      // Measure with a hidden clone so we never mutate the visible element
      const clone = textNode.cloneNode(true) as HTMLElement;
      clone.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;display:inline-block;transform:none;";
      clone.style.fontSize = `${MAX_FONT_SIZE}px`;
      document.body.appendChild(clone);
      const naturalAtMax = clone.scrollWidth;
      if (naturalAtMax <= 0) {
        document.body.removeChild(clone);
        return;
      }

      const ideal = (MAX_FONT_SIZE * availableWidth) / naturalAtMax;
      const fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.floor(ideal)));

      // If we clamped at MIN_FONT_SIZE but text still overflows, squeeze with scaleX
      let scaleX = 1;
      if (fontSize === MIN_FONT_SIZE) {
        clone.style.fontSize = `${MIN_FONT_SIZE}px`;
        const naturalAtMin = clone.scrollWidth;
        if (naturalAtMin > availableWidth) scaleX = availableWidth / naturalAtMin;
      }
      document.body.removeChild(clone);

      setFit({ fontSize, scaleX });
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(container);

    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) fitText();
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text]);

  return (
    <section className="w-full overflow-x-hidden px-[clamp(18px,3vw,56px)] pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
      <h1
        ref={containerRef}
        className="mx-auto flex w-full items-center justify-center overflow-hidden whitespace-nowrap font-black leading-none tracking-normal text-text-primary"
      >
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
