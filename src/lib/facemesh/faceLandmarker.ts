"use client";

import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type FaceLandmarkerDelegate = "GPU" | "CPU";

let singleton: Promise<FaceLandmarker> | null = null;
let singletonDelegate: FaceLandmarkerDelegate | null = null;

export async function getFaceLandmarker(delegate: FaceLandmarkerDelegate = "GPU"): Promise<FaceLandmarker> {
  if (!singleton || singletonDelegate !== delegate) {
    singletonDelegate = delegate;
    singleton = createFaceLandmarker(delegate);
  }
  return singleton;
}

export type { FaceLandmarkerResult };

async function createFaceLandmarker(delegate: FaceLandmarkerDelegate): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm");
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: 2,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}
