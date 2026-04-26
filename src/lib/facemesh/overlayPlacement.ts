import type { FaceBox } from "@/types/analysis";

export type OverlaySlot = "L1" | "L2" | "R2" | "R1" | "CENTER" | "LIVE";

export interface OverlayPlacementInput {
  faceBox: FaceBox | null;
  viewport: { width: number; height: number };
  existingSlots: OverlaySlot[];
  kind?: "section" | "conclusion" | "live";
}

export interface OverlayPlacement {
  slot: OverlaySlot;
  style: {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    transform?: string;
    width: string;
  };
}

export function placeOverlay(input: OverlayPlacementInput): OverlayPlacement {
  if (input.kind === "conclusion") {
    return {
      slot: "CENTER",
      style: { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(760px, 58vw)" },
    };
  }
  if (input.kind === "live") {
    return {
      slot: "LIVE",
      style: { right: "28px", bottom: "32px", width: "min(420px, 28vw)" },
    };
  }

  const ratio = faceAreaRatio(input.faceBox);
  const preferred: OverlaySlot[] =
    ratio < 0.35 ? ["R2", "L2", "R1", "L1"] : ratio < 0.65 ? ["R1", "L1", "R2", "L2"] : ["R1", "L1"];
  const slot = preferred.find((candidate) => !input.existingSlots.includes(candidate)) ?? preferred[0]!;
  const stackIndex = input.existingSlots.filter((candidate) => candidate === slot).length;
  return { slot, style: slotStyle(slot, stackIndex) };
}

function faceAreaRatio(faceBox: FaceBox | null): number {
  if (!faceBox) return 0.4;
  return Math.max(0, Math.min(1, faceBox.width * faceBox.height));
}

function slotStyle(slot: OverlaySlot, stackIndex: number): OverlayPlacement["style"] {
  const top = `${24 + stackIndex * 138}px`;
  const width = "min(390px, 25vw)";
  switch (slot) {
    case "L1":
      return { left: "28px", top, width };
    case "L2":
      return { left: "18vw", top, width };
    case "R2":
      return { right: "18vw", top, width };
    case "R1":
    default:
      return { right: "28px", top, width };
  }
}
