"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2 } from "lucide-react";
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
      animate={{ opacity: expanded ? 1 : 0.62, y: 0, scale: expanded ? 1 : 0.94 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel overflow-hidden rounded-xl ${expanded ? "p-4 shadow-2xl shadow-black/30" : "p-3"} ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-6 w-1 rounded-full ${accent}`} />
          <h2 className="truncate text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{title}</h2>
        </div>
        {expanded && isStreaming ? <Activity className="h-4 w-4 shrink-0 animate-pulse text-accent-info" /> : !expanded ? <CheckCircle2 className="h-4 w-4 shrink-0 text-text-faint" /> : null}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {isProgress ? (
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
              <p className={`${tone === "verdict" ? "max-h-[24vh] text-base leading-7" : "max-h-[22vh] text-sm leading-6"} overflow-y-auto pr-1 font-medium text-text-primary`}>{visible}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
