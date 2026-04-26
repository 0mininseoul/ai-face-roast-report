"use client";

import { useEffect } from "react";
import { stopGlobalCameraStream } from "@/lib/camera/globalStream";

export function StopCameraOnMount() {
  useEffect(() => {
    stopGlobalCameraStream();
  }, []);
  return null;
}
