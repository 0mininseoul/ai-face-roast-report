"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { playSfx } from "@/lib/sound/sfx";

export function AnalysisCard({
  title,
  text,
  tone = "clinical",
  isStreaming,
  className = "",
}: {
  title: string;
  text: string;
  tone?: "clinical" | "verdict";
  isStreaming?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState("");
  const accent = tone === "verdict" ? "bg-accent-bad" : "bg-accent-info";

  const clean = useMemo(() => text.replace(/\s+/g, " ").trim(), [text]);

  useEffect(() => {
    playSfx(tone === "verdict" ? "verdict" : "card_in");
  }, [tone]);

  useEffect(() => {
    setVisible("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 3;
      setVisible(clean.slice(0, index));
      if (index >= clean.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [clean]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`glass-panel rounded-xl p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-6 w-1 rounded-full ${accent}`} />
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{title}</h2>
        </div>
        {isStreaming && <Activity className="h-4 w-4 animate-pulse text-accent-info" />}
      </div>
      <p className="text-sm font-medium leading-6 text-text-primary">{visible}</p>
    </motion.article>
  );
}
