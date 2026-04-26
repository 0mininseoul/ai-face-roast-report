"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";

export function LiveFeed({ comments }: { comments: string[] }) {
  if (comments.length === 0) return null;
  return (
    <div className="fixed bottom-8 right-7 z-20 flex w-[min(420px,28vw)] flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
        <Radio className="h-3.5 w-3.5 text-accent-bad" />
        Live feed
      </div>
      <AnimatePresence>
        {comments.slice(-5).map((comment, index) => (
          <motion.div
            key={`${comment}-${index}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="glass-panel rounded-lg border-accent-bad/20 p-3 text-sm font-semibold leading-5 text-text-primary"
          >
            {comment}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
