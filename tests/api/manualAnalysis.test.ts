import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/admindata/api/manual-analysis/route";

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
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: mocks.waitUntil,
}));

vi.mock("@/lib/analysis/jobRunner", () => ({
  drainAnalysisQueue: mocks.drainAnalysisQueue,
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

const REPORT_ID = "11111111-1111-4111-8111-111111111111";

describe("POST /admindata/api/manual-analysis", () => {
  beforeEach(() => {
    process.env.ADMIN_DATA_USERNAME = "admin";
    process.env.ADMIN_DATA_PASSWORD = "secret";

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
    delete process.env.ADMIN_DATA_USERNAME;
    delete process.env.ADMIN_DATA_PASSWORD;
  });

  it("creates a manual upload report with seven day public expiry", async () => {
    const response = await POST(manualRequest(validBody()));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      reportId: REPORT_ID,
      status: "queued",
      publicResultUrl: `https://example.com/result/${REPORT_ID}`,
      adminResultUrl: `https://example.com/admindata/facereportpages/${REPORT_ID}`,
    });

    const inserted = mocks.insert.mock.calls[0]?.[0];
    expect(inserted).toMatchObject({
      gender: "male",
      status: "queued",
      analysis_source: "manual_upload",
      analysis_tone: "balanced",
      admin_note: "manual exception",
      manual_detected_face_count: 2,
    });
    expect(new Date(inserted.expires_at).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(mocks.upload).toHaveBeenCalledWith(`${REPORT_ID}/manual-upload.jpg`, expect.any(Buffer), {
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(mocks.drainAnalysisQueue).toHaveBeenCalledWith({ targetId: REPORT_ID });
    expect(mocks.waitUntil).toHaveBeenCalled();
  });

  it("rejects missing required payload fields before storage", async () => {
    const response = await POST(manualRequest({ ...validBody(), metrics: undefined }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("missing_required_fields");
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });
});

function manualRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/admindata/api/manual-analysis", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authHeader("admin", "secret"),
    },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    gender: "male",
    analysisTone: "balanced",
    imageBase64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`,
    metrics: { asymmetryIndex: 0.1 },
    landmarks: Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
    manualDetectedFaceCount: 2,
    adminNote: "manual exception",
  };
}

function authHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
