"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const MAX_LENGTH = 2000;

type Status = "idle" | "submitting" | "sent" | "error";

export function FeedbackButton({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, reportId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(
          data.error === "rate_limited"
            ? "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요."
            : "전송에 실패했어요. 다시 시도해주세요.",
        );
        setStatus("error");
        return;
      }
      setStatus("sent");
      window.setTimeout(() => {
        setOpen(false);
        setMessage("");
        setStatus("idle");
      }, 1400);
    } catch {
      setErrorMsg("네트워크 오류가 발생했어요.");
      setStatus("error");
    }
  }

  const submitting = status === "submitting";
  const sent = status === "sent";

  return (
    <>
      <Button
        variant="ghost"
        className="px-3 sm:px-4"
        aria-label="개발자에게 의견 보내기"
        title="개발자에게 의견 보내기"
        icon={<MessageSquare className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        <span className="hidden sm:inline">의견 보내기</span>
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="개발자에게 의견 보내기"
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-bg-card p-6 shadow-panel">
            <h2 className="text-base font-semibold text-text-primary">개발자에게 의견 보내기</h2>
            <p className="mt-1 text-xs text-text-muted">버그, 개선 아이디어, 후기 무엇이든 환영합니다.</p>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              rows={6}
              placeholder="의견을 자유롭게 남겨주세요"
              className="mt-4 w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent-info"
              disabled={submitting || sent}
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-text-faint">
                {message.length} / {MAX_LENGTH}
              </span>
              {errorMsg && <span className="text-accent-bad">{errorMsg}</span>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="px-4" onClick={() => setOpen(false)} disabled={submitting}>
                취소
              </Button>
              <Button
                variant="primary"
                className="px-4"
                onClick={submit}
                disabled={!message.trim() || submitting || sent}
              >
                {sent ? "전송 완료" : submitting ? "전송 중..." : "보내기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
