"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_SIZE = 64;
const MIN_FONT_SIZE = 14;
const MIN_SCALE_X = 0.82;
const SQUEEZE_FLOOR = 10;

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

      const computed = window.getComputedStyle(textNode);
      const clone = textNode.cloneNode(true) as HTMLElement;
      clone.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;display:inline-block;transform:none;";
      clone.style.fontFamily = computed.fontFamily;
      clone.style.fontWeight = computed.fontWeight;
      clone.style.fontFeatureSettings = computed.fontFeatureSettings;
      clone.style.letterSpacing = computed.letterSpacing;
      clone.style.lineHeight = computed.lineHeight;
      clone.style.fontSize = `${MAX_FONT_SIZE}px`;
      document.body.appendChild(clone);
      const naturalAtMax = clone.scrollWidth;
      if (naturalAtMax <= 0) {
        document.body.removeChild(clone);
        return;
      }

      const ideal = (MAX_FONT_SIZE * availableWidth) / naturalAtMax;
      let fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.floor(ideal)));
      let scaleX = 1;

      if (fontSize === MIN_FONT_SIZE) {
        clone.style.fontSize = `${MIN_FONT_SIZE}px`;
        const naturalAtMin = clone.scrollWidth;
        if (naturalAtMin > availableWidth) {
          const ratio = availableWidth / naturalAtMin;
          // If squeezing past MIN_SCALE_X would distort glyphs, drop fontSize further
          // (down to SQUEEZE_FLOOR) so scaleX stays in a readable range.
          if (ratio < MIN_SCALE_X) {
            const squeezed = Math.max(SQUEEZE_FLOOR, Math.floor(MIN_FONT_SIZE * ratio / MIN_SCALE_X));
            clone.style.fontSize = `${squeezed}px`;
            const naturalAtSqueezed = clone.scrollWidth;
            fontSize = squeezed;
            scaleX = naturalAtSqueezed > availableWidth ? availableWidth / naturalAtSqueezed : 1;
          } else {
            scaleX = ratio;
          }
        }
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
