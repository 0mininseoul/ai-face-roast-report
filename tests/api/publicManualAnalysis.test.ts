import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/manual-analysis/route";
import { checkDailyQuota, recordQuotaUsage } from "@/lib/analysis/quota";

const mocks = vi.hoisted(() => ({
  drainAnalysisQueue: vi.fn(),
  waitUntil: vi.fn(),
  logServiceEvent: vi.fn(),
  supabaseFrom: vi.fn(),
  storageFrom: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  upload: vi.fn(),
  checkRateLimit: vi.fn(),
  ipFromRequest: vi.fn(),
  ipHash: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: mocks.waitUntil,
}));

vi.mock("@/lib/analysis/jobRunner", () => ({
  drainAnalysisQueue: mocks.drainAnalysisQueue,
}));

vi.mock("@/lib/analysis/quota", () => ({
  checkDailyQuota: vi.fn(),
  recordQuotaUsage: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  ipFromRequest: mocks.ipFromRequest,
  ipHash: mocks.ipHash,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(() => ({
    from: mocks.supabaseFrom,
    storage: { from: mocks.storageFrom },
  })),
}));

vi.mock("@/lib/telemetry/server", () => ({
  logServiceEvent: mocks.logServiceEvent,
}));

const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const checkDailyQuotaMock = vi.mocked(checkDailyQuota);
const recordQuotaUsageMock = vi.mocked(recordQuotaUsage);

describe("POST /api/manual-analysis", () => {
  beforeEach(() => {
    mocks.drainAnalysisQueue.mockResolvedValue({
      attempted: 1,
      claimed: 1,
      completed: 0,
      failed: 0,
      retrying: 0,
      skipped: 0,
      durationMs: 1,
      remainingBudgetMs: 1000,
      results: [{ completed: false, reportId: REPORT_ID, status: "queued" }],
    });
    mocks.waitUntil.mockImplementation(() => undefined);
    mocks.checkRateLimit.mockReturnValue({ ok: true, retryAfterSec: 0 });
    mocks.ipFromRequest.mockReturnValue("203.0.113.2");
    mocks.ipHash.mockResolvedValue("hashed-ip");
    checkDailyQuotaMock.mockResolvedValue({ ok: true, count: 0, limit: 3, windowHours: 24, matchedBy: "ip_and_device" });
    recordQuotaUsageMock.mockResolvedValue(undefined);
    mocks.single.mockResolvedValue({ data: { id: REPORT_ID }, error: null });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.supabaseFrom.mockReturnValue({ insert: mocks.insert, update: mocks.update });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.storageFrom.mockReturnValue({ upload: mocks.upload });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a public manual upload report without an admin note", async () => {
    const response = await POST(manualRequest(validBody()));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      reportId: REPORT_ID,
      status: "queued",
      publicResultUrl: `https://example.com/result/${REPORT_ID}`,
    });
    expect(body.adminResultUrl).toBeUndefined();

    const inserted = mocks.insert.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      gender: "female",
      status: "queued",
      analysis_source: "manual_upload",
      analysis_tone: "balanced",
      admin_note: null,
      manual_detected_face_count: 1,
      ip_hash: "hashed-ip",
    });
    expect(mocks.upload).toHaveBeenCalledWith(`${REPORT_ID}/manual-upload.jpg`, expect.any(Buffer), {
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(recordQuotaUsageMock).toHaveBeenCalledWith({ ipHash: "hashed-ip", deviceId: "device-1", reportId: REPORT_ID });
    expect(mocks.drainAnalysisQueue).toHaveBeenCalledWith({ targetId: REPORT_ID });
    expect(mocks.waitUntil).toHaveBeenCalled();
  });

  it("rejects daily quota before storage work", async () => {
    checkDailyQuotaMock.mockResolvedValueOnce({ ok: false, count: 3, limit: 3, windowHours: 24, matchedBy: "ip_and_device" });

    const response = await POST(manualRequest(validBody()));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("daily_limit_reached");
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

function manualRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/manual-analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    gender: "female",
    analysisTone: "balanced",
    deviceId: "device-1",
    imageBase64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`,
    metrics: { asymmetryIndex: 0.1 },
    landmarks: Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
    manualDetectedFaceCount: 1,
    adminNote: "must be ignored",
  };
}
