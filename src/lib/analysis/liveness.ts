import type { Landmark } from "@/types/analysis";

export const MIN_LANDMARK_VARIANCE = 0.00015;
export const HARD_BLOCK_VARIANCE = 0.00005;

export interface LivenessSignal {
  variance: number;
  sampleCount: number;
}

export function computeLivenessSignal(samples: Landmark[][]): LivenessSignal {
  const variance = computeLandmarkVariance(samples);
  return {
    variance,
    sampleCount: samples.length,
  };
}

export function isLivenessAcceptable(signal: Pick<LivenessSignal, "variance">): boolean {
  return signal.variance >= MIN_LANDMARK_VARIANCE;
}

export function isLivenessHardBlocked(signal: Pick<LivenessSignal, "variance">): boolean {
  return signal.variance < HARD_BLOCK_VARIANCE;
}

function computeLandmarkVariance(samples: Landmark[][]): number {
  if (samples.length < 2) return 0;
  const length = samples[0]?.length ?? 0;
  if (length === 0) return 0;

  let totalStddev = 0;
  let counted = 0;
  for (let index = 0; index < length; index += 1) {
    let sumX = 0;
    let sumY = 0;
    let included = 0;
    for (const sample of samples) {
      const point = sample[index];
      if (!point) continue;
      sumX += point.x;
      sumY += point.y;
      included += 1;
    }
    if (included < 2) continue;

    const meanX = sumX / included;
    const meanY = sumY / included;
    let varSum = 0;
    for (const sample of samples) {
      const point = sample[index];
      if (!point) continue;
      const dx = point.x - meanX;
      const dy = point.y - meanY;
      varSum += dx * dx + dy * dy;
    }
    totalStddev += Math.sqrt(varSum / included);
    counted += 1;
  }

  return counted > 0 ? totalStddev / counted : 0;
}
