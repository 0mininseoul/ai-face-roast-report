import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { MIN_LANDMARK_VARIANCE } from "@/lib/analysis/liveness";
import { checkDailyQuota } from "@/lib/analysis/quota";

vi.mock("@vercel/functions", () => ({
  waitUntil: vi.fn(),
}));

vi.mock("@/lib/analysis/jobRunner", () => ({
  drainAnalysisQueue: vi.fn(),
}));

vi.mock("@/lib/analysis/quota", () => ({
  checkDailyQuota: vi.fn(),
  recordQuotaUsage: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true, retryAfterSec: 0 })),
  ipFromRequest: vi.fn(() => "203.0.113.1"),
  ipHash: vi.fn(async () => "hashed-ip"),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(() => ({})),
}));

vi.mock("@/lib/telemetry/server", () => ({
  logServiceEvent: vi.fn(),
}));

const checkDailyQuotaMock = vi.mocked(checkDailyQuota);

describe("POST /api/analyze liveness gate", () => {
  afterEach(() => {
    checkDailyQuotaMock.mockReset();
  });

  it("rejects requests without client liveness evidence before quota/storage work", async () => {
    const response = await POST(analyzeRequest({ liveness: undefined }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("live_capture_required");
    expect(checkDailyQuotaMock).not.toHaveBeenCalled();
  });

  it("rejects requests with low landmark variance", async () => {
    const response = await POST(analyzeRequest({ liveness: { variance: MIN_LANDMARK_VARIANCE / 2 } }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("live_capture_required");
    expect(checkDailyQuotaMock).not.toHaveBeenCalled();
  });

  it("rejects unknown analysis tone values", async () => {
    const response = await POST(analyzeRequest({ analysisTone: "soft", liveness: { variance: MIN_LANDMARK_VARIANCE * 2 } }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_analysis_tone");
    expect(checkDailyQuotaMock).not.toHaveBeenCalled();
  });
});

function analyzeRequest({ analysisTone, liveness }: { analysisTone?: string; liveness?: { variance: number } }) {
  return new NextRequest("https://example.com/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gender: "male",
      analysisTone,
      metrics: { asymmetryIndex: 0.1 },
      imageBase64: "data:image/jpeg;base64,AAAA",
      clientSessionId: "session-1",
      liveness:
        liveness === undefined
          ? undefined
          : {
              variance: liveness.variance,
              sampleCount: 18,
            },
    }),
  });
}
