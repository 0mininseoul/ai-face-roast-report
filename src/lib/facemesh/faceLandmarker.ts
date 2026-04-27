"use client";

import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type FaceLandmarkerDelegate = "GPU" | "CPU";
type FaceLandmarkerRunningMode = "VIDEO" | "IMAGE";

const singletonByKey = new Map<string, Promise<FaceLandmarker>>();

export async function getFaceLandmarker(delegate: FaceLandmarkerDelegate = "GPU"): Promise<FaceLandmarker> {
  return getFaceLandmarkerForMode("VIDEO", delegate);
}

export async function getFaceImageLandmarker(delegate: FaceLandmarkerDelegate = "CPU"): Promise<FaceLandmarker> {
  return getFaceLandmarkerForMode("IMAGE", delegate);
}

export type { FaceLandmarkerResult };

function getFaceLandmarkerForMode(mode: FaceLandmarkerRunningMode, delegate: FaceLandmarkerDelegate): Promise<FaceLandmarker> {
  const key = `${mode}:${delegate}`;
  const existing = singletonByKey.get(key);
  if (existing) return existing;

  const created = createFaceLandmarker(mode, delegate);
  singletonByKey.set(key, created);
  return created;
}

async function createFaceLandmarker(mode: FaceLandmarkerRunningMode, delegate: FaceLandmarkerDelegate): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm");
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate,
    },
    runningMode: mode,
    numFaces: 2,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}
