import type { FaceBox, FaceMetrics, ForeheadClassification, Landmark } from "@/types/analysis";

// MediaPipe FaceMesh underestimates the forehead because its top landmark sits
// roughly 1.5~2cm above the brow rather than at the hairline. Across the first
// 18 production reports areaPct landed in 11.8%~23.3% (avg 16, σ 2.75), so the
// thirds-based 33% reference is unreachable. These thresholds split that real
// distribution into narrow / average / wide instead of comparing to the myth.
const FOREHEAD_NARROW_BELOW = 14;
const FOREHEAD_WIDE_ABOVE = 18;

const IDX = {
  chin: 152,
  forehead: 10,
  noseBridge: 168,
  noseTip: 1,
  noseBottom: 2,
  noseLeft: 49,
  noseRight: 279,
  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  leftMouth: 61,
  rightMouth: 291,
  upperLip: 13,
  lowerLip: 14,
  browLeft: 105,
  browRight: 334,
} as const;

export function computeFaceMetrics(landmarks: Landmark[]): FaceMetrics {
  if (landmarks.length < 468) {
    throw new Error("FaceMetrics requires at least 468 MediaPipe landmarks");
  }

  const box = computeFaceBox(landmarks);
  const faceHeight = Math.max(distance(point(landmarks, IDX.forehead), point(landmarks, IDX.chin)), 0.0001);
  const faceWidth = Math.max(distance(point(landmarks, IDX.leftCheek), point(landmarks, IDX.rightCheek)), 0.0001);
  const ipd = Math.max(distance(point(landmarks, IDX.leftEyeOuter), point(landmarks, IDX.rightEyeOuter)), 0.0001);
  const mm = 63 / ipd;

  const eyeDelta = Math.abs(
    distance(point(landmarks, IDX.leftEyeTop), point(landmarks, IDX.leftEyeBottom)) -
      distance(point(landmarks, IDX.rightEyeTop), point(landmarks, IDX.rightEyeBottom)),
  );
  const noseLength = distance(point(landmarks, IDX.noseBridge), point(landmarks, IDX.noseBottom));
  const noseWidth = distance(point(landmarks, IDX.noseLeft), point(landmarks, IDX.noseRight));
  const mouthWidth = distance(point(landmarks, IDX.leftMouth), point(landmarks, IDX.rightMouth));
  const upperLip = distance(point(landmarks, IDX.upperLip), point(landmarks, IDX.leftMouth));
  const lowerLip = distance(point(landmarks, IDX.lowerLip), point(landmarks, IDX.leftMouth));
  const upperThird = Math.abs(point(landmarks, IDX.browLeft).y - box.y) / box.height;
  const middleThird = Math.abs(point(landmarks, IDX.noseBottom).y - point(landmarks, IDX.browLeft).y) / box.height;
  const lowerThird = Math.abs(box.y + box.height - point(landmarks, IDX.noseBottom).y) / box.height;
  const fifths = computeFifths(landmarks, box);

  const symmetryPairs: Array<[number, number]> = [
    [IDX.leftEyeOuter, IDX.rightEyeOuter],
    [IDX.leftEyeInner, IDX.rightEyeInner],
    [IDX.leftCheek, IDX.rightCheek],
    [IDX.leftJaw, IDX.rightJaw],
    [IDX.leftMouth, IDX.rightMouth],
    [IDX.noseLeft, IDX.noseRight],
    [IDX.browLeft, IDX.browRight],
  ];
  const midX = point(landmarks, IDX.noseBridge).x;
  const asymmetryIndex =
    symmetryPairs.reduce((sum, [left, right]) => {
      const l = point(landmarks, left);
      const r = point(landmarks, right);
      return sum + Math.abs(Math.abs(l.x - midX) - Math.abs(r.x - midX));
    }, 0) / symmetryPairs.length;

  const faceAspectRatio = faceWidth / faceHeight;
  const phiTarget = 1 / 1.618;
  const phiError = Math.abs(faceAspectRatio - phiTarget);
  const phiRatioCompliance = clamp((1 - phiError / phiTarget) * 100, 0, 100);

  return {
    asymmetryIndex: round(asymmetryIndex, 4),
    phiRatioCompliance: round(phiRatioCompliance, 1),
    thirds: {
      upper: round(upperThird, 3),
      middle: round(middleThird, 3),
      lower: round(lowerThird, 3),
    },
    fifths: fifths.map((value) => round(value, 3)),
    faceAspectRatio: round(faceAspectRatio, 3),
    eyeSpacing: round(distance(point(landmarks, IDX.leftEyeInner), point(landmarks, IDX.rightEyeInner)) / ipd, 3),
    facialAngleDeg: round(angle(point(landmarks, IDX.forehead), point(landmarks, IDX.noseTip), point(landmarks, IDX.chin)), 1),
    forehead: (() => {
      const areaPct = round(clamp(upperThird * 100, 0, 100), 1);
      return {
        areaPct,
        brow: round(Math.abs(point(landmarks, IDX.browLeft).y - point(landmarks, IDX.browRight).y) * mm, 1),
        classification: classifyForehead(areaPct),
      };
    })(),
    eyes: {
      leftToRightDeltaMm: round(eyeDelta * mm, 1),
      outerCantalAngleDeg: round(
        radiansToDeg(Math.atan2(point(landmarks, IDX.rightEyeOuter).y - point(landmarks, IDX.leftEyeOuter).y, faceWidth)),
        1,
      ),
    },
    nose: {
      lengthMm: round(noseLength * mm, 1),
      widthMm: round(noseWidth * mm, 1),
      columellaAngleDeg: round(angle(point(landmarks, IDX.noseLeft), point(landmarks, IDX.noseBottom), point(landmarks, IDX.noseRight)), 1),
    },
    mouth: {
      upperLowerLipRatio: round(upperLip / Math.max(lowerLip, 0.0001), 2),
      philtrumRatioPct: round((Math.abs(point(landmarks, IDX.noseBottom).y - point(landmarks, IDX.upperLip).y) / faceHeight) * 100, 1),
      cornerAngleDeg: round(radiansToDeg(Math.atan2(point(landmarks, IDX.rightMouth).y - point(landmarks, IDX.leftMouth).y, mouthWidth)), 1),
    },
    jaw: {
      vlineIndex: round(1 - distance(point(landmarks, IDX.leftJaw), point(landmarks, IDX.rightJaw)) / faceWidth, 3),
      chinProtrusionMm: round(Math.abs(point(landmarks, IDX.chin).z - point(landmarks, IDX.noseTip).z) * mm, 1),
      cheekToJawRatio: round(faceWidth / Math.max(distance(point(landmarks, IDX.leftJaw), point(landmarks, IDX.rightJaw)), 0.0001), 2),
    },
    faceBox: box,
  };
}

export function averageLandmarks(samples: Landmark[][]): Landmark[] {
  if (samples.length === 0) return [];
  const count = samples[0]?.length ?? 0;
  return Array.from({ length: count }, (_, index) => {
    const acc = samples.reduce(
      (sum, landmarks) => {
        const p = landmarks[index] ?? { x: 0, y: 0, z: 0 };
        sum.x += p.x;
        sum.y += p.y;
        sum.z += p.z;
        return sum;
      },
      { x: 0, y: 0, z: 0 },
    );
    return {
      x: acc.x / samples.length,
      y: acc.y / samples.length,
      z: acc.z / samples.length,
    };
  });
}

export function computeFaceBox(landmarks: Landmark[]): FaceBox {
  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: round(minX, 4),
    y: round(minY, 4),
    width: round(maxX - minX, 4),
    height: round(maxY - minY, 4),
  };
}

function computeFifths(landmarks: Landmark[], box: FaceBox): number[] {
  const points = [
    box.x,
    point(landmarks, IDX.leftEyeOuter).x,
    point(landmarks, IDX.leftEyeInner).x,
    point(landmarks, IDX.rightEyeInner).x,
    point(landmarks, IDX.rightEyeOuter).x,
    box.x + box.width,
  ].sort((a, b) => a - b);
  const segments = points.slice(1).map((p, i) => Math.max(p - points[i]!, 0.0001));
  const total = segments.reduce((sum, value) => sum + value, 0);
  return segments.map((value) => value / total);
}

function classifyForehead(areaPct: number): ForeheadClassification {
  if (areaPct < FOREHEAD_NARROW_BELOW) return "narrow";
  if (areaPct > FOREHEAD_WIDE_ABOVE) return "wide";
  return "average";
}

function point(landmarks: Landmark[], index: number): Landmark {
  const p = landmarks[index];
  if (!p) throw new Error(`Missing landmark ${index}`);
  return p;
}

function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return radiansToDeg(Math.acos(clamp(dot / Math.max(mag, 0.0001), -1, 1)));
}

function radiansToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
