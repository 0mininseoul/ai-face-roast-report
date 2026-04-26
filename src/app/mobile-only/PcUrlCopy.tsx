"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const DEFAULT_URL = "https://faceroast.vercel.app";

export function PcUrlCopy() {
  const [pcUrl, setPcUrl] = useState(DEFAULT_URL);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPcUrl(window.location.origin);
  }, []);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pcUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = pcUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-6 border-t border-border/70 pt-5">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-black/20 p-2">
        <div className="min-w-0 flex-1 truncate px-2 text-left text-[0.8rem] font-semibold leading-5 text-text-primary">
          {pcUrl}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 shrink-0 px-3 text-xs"
          icon={copied ? <Check className="h-4 w-4 text-accent-ok" /> : <Copy className="h-4 w-4" />}
          onClick={copyUrl}
        >
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
    </div>
  );
}
