"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_SIZE = 64;
const MIN_FONT_SIZE = 14;
const MIN_SCALE_X = 0.82;
const SQUEEZE_FLOOR = 10;
const MOBILE_BREAKPOINT = 640;
const MOBILE_MAX_FONT_SIZE = 44;
const MOBILE_MIN_FONT_SIZE = 18;
const MOBILE_LINE_HEIGHT = 1.08;

export function MainCopy({ text }: { text: string }) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [fit, setFit] = useState({ fontSize: MAX_FONT_SIZE, scaleX: 1, multiline: false });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    const fitText = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0) return;

      const computed = window.getComputedStyle(textNode);
      const clone = textNode.cloneNode(true) as HTMLElement;
      clone.style.fontFamily = computed.fontFamily;
      clone.style.fontWeight = computed.fontWeight;
      clone.style.fontFeatureSettings = computed.fontFeatureSettings;
      clone.style.letterSpacing = computed.letterSpacing;
      clone.style.transform = "none";
      clone.style.position = "fixed";
      clone.style.left = "-9999px";
      clone.style.top = "-9999px";
      clone.style.visibility = "hidden";
      document.body.appendChild(clone);

      if (availableWidth < MOBILE_BREAKPOINT) {
        clone.style.width = `${availableWidth}px`;
        clone.style.display = "block";
        clone.style.whiteSpace = "normal";
        clone.style.wordBreak = "keep-all";
        clone.style.overflowWrap = "anywhere";

        let best = MOBILE_MIN_FONT_SIZE;
        for (let size = MOBILE_MIN_FONT_SIZE; size <= MOBILE_MAX_FONT_SIZE; size += 1) {
          clone.style.fontSize = `${size}px`;
          clone.style.lineHeight = `${Math.round(size * MOBILE_LINE_HEIGHT)}px`;
          const maxHeight = Math.ceil(size * MOBILE_LINE_HEIGHT * 2) + 1;
          if (clone.scrollWidth <= availableWidth + 1 && clone.scrollHeight <= maxHeight) best = size;
        }

        document.body.removeChild(clone);
        setFit({ fontSize: best, scaleX: 1, multiline: true });
        return;
      }

      clone.style.width = "auto";
      clone.style.display = "inline-block";
      clone.style.whiteSpace = "nowrap";
      clone.style.lineHeight = computed.lineHeight;
      clone.style.fontSize = `${MAX_FONT_SIZE}px`;
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

      setFit({ fontSize, scaleX, multiline: false });
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
        className="mx-auto flex w-full items-center justify-center overflow-hidden font-black leading-none tracking-normal text-text-primary"
      >
        <span
          ref={textRef}
          className="inline-block max-w-full"
          style={{
            fontSize: fit.fontSize,
            lineHeight: fit.multiline ? MOBILE_LINE_HEIGHT : 1,
            transform: `scaleX(${fit.scaleX})`,
            transformOrigin: "center",
            whiteSpace: fit.multiline ? "normal" : "nowrap",
            wordBreak: fit.multiline ? "keep-all" : "normal",
            overflowWrap: fit.multiline ? "anywhere" : "normal",
            display: fit.multiline ? "-webkit-box" : "inline-block",
            WebkitLineClamp: fit.multiline ? 2 : undefined,
            WebkitBoxOrient: fit.multiline ? "vertical" : undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text}
        </span>
      </h1>
    </section>
  );
}
