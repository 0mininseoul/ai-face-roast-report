"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { playSfx } from "@/lib/sound/sfx";

export function AnalysisCard({
  title,
  text,
  tone = "clinical",
  isStreaming,
  expanded = true,
  progressPercent,
  progressLabel,
  action,
  children,
  onToggle,
  className = "",
}: {
  title: string;
  text: string;
  tone?: "clinical" | "verdict";
  isStreaming?: boolean;
  expanded?: boolean;
  progressPercent?: number;
  progressLabel?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  onToggle?: () => void;
  className?: string;
}) {
  const [visible, setVisible] = useState("");
  const accent = tone === "verdict" ? "bg-accent-bad" : "bg-accent-info";
  const isProgress = typeof progressPercent === "number";

  const clean = useMemo(() => text.replace(/\s+/g, " ").trim(), [text]);

  useEffect(() => {
    if (expanded) playSfx(tone === "verdict" ? "verdict" : "card_in");
  }, [expanded, tone]);

  useEffect(() => {
    if (!expanded || isProgress) {
      setVisible(clean);
      return;
    }

    setVisible("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 3;
      setVisible(clean.slice(0, index));
      if (index >= clean.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [clean, expanded, isProgress]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: expanded ? 1 : 0.78, y: 0, scale: expanded ? 1 : 0.97 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel relative overflow-hidden rounded-xl ${expanded ? "p-4 shadow-2xl shadow-black/35" : "p-3"} ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-[11px] border border-white/10 bg-[linear-gradient(115deg,rgb(255_255_255_/_0.18),transparent_30%,rgb(125_216_255_/_0.08)_58%,transparent_82%)] opacity-80"
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/45" />
      <button type="button" className={`relative z-10 flex w-full items-center justify-between gap-4 text-left ${expanded ? "mb-3" : ""}`} onClick={onToggle} aria-expanded={expanded}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-6 w-1 shrink-0 rounded-full ${accent}`} />
          <span className="truncate text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {expanded && isStreaming && <Activity className="h-4 w-4 animate-pulse text-accent-info" />}
          <ChevronDown className={`h-4 w-4 text-text-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            className="relative z-10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children ? (
              children
            ) : isProgress ? (
              <div>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <p className="text-sm font-medium leading-6 text-text-primary">{progressLabel ?? visible}</p>
                  <span className="text-2xl font-black tabular-nums text-text-primary">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-accent-info transition-[width] duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : (
              <p className={`${tone === "verdict" ? "max-h-[28vh] text-base leading-7" : "max-h-[96px] text-sm leading-6"} overflow-y-auto pr-1 font-medium text-text-primary`}>{visible}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
