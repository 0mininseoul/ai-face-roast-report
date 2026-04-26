"use client";

import { Howl } from "howler";

const SFX = {
  boot: { src: "/sfx/boot.mp3", volume: 0.45 },
  card_in: { src: "/sfx/card_in.mp3", volume: 0.35 },
  type: { src: "/sfx/type.mp3", volume: 0.12 },
  gauge: { src: "/sfx/gauge.mp3", volume: 0.35 },
  verdict: { src: "/sfx/verdict.mp3", volume: 0.55 },
  live_ping: { src: "/sfx/live_ping.mp3", volume: 0.3 },
} as const;

const cache = new Map<keyof typeof SFX, Howl>();
let muted = false;
const enabled = process.env.NEXT_PUBLIC_ENABLE_SFX === "true";

export function setMuted(next: boolean) {
  muted = next;
  for (const howl of cache.values()) howl.mute(next);
}

export function playSfx(key: keyof typeof SFX) {
  if (typeof window === "undefined" || muted || !enabled) return;
  try {
    let howl = cache.get(key);
    if (!howl) {
      const def = SFX[key];
      howl = new Howl({ src: [def.src], volume: def.volume, html5: true });
      howl.mute(muted);
      cache.set(key, howl);
    }
    howl.play();
  } catch {
    // Missing optional SFX files should never break the product flow.
  }
}
