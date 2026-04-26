"use client";

import { Camera, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ControlBar({
  muted,
  onMutedChange,
  onScreenshot,
}: {
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onScreenshot: () => void;
}) {
  return (
    <div className="glass-panel fixed right-6 top-6 z-30 flex items-center gap-2 rounded-xl p-2">
      <Button className="h-10 px-3" variant="ghost" onClick={onScreenshot} icon={<Camera className="h-4 w-4" />}>
        스크린샷
      </Button>
      <button
        aria-label={muted ? "음소거 해제" : "음소거"}
        onClick={() => onMutedChange(!muted)}
        className="grid h-10 w-10 place-items-center rounded-md border border-border bg-bg-card text-text-muted transition hover:border-border-bright hover:text-text-primary"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
