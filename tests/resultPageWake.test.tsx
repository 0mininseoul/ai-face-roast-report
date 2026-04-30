import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultPageContent } from "@/components/pages/ResultPage";

const mocks = vi.hoisted(() => ({
  drainAnalysisQueue: vi.fn(),
  shouldWakeAnalysisJob: vi.fn(),
  waitUntil: vi.fn(),
  logServiceEvent: vi.fn(),
  supabaseFrom: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  noStore: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: mocks.waitUntil,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  unstable_noStore: mocks.noStore,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/analysis/jobRunner", () => ({
  drainAnalysisQueue: mocks.drainAnalysisQueue,
  shouldWakeAnalysisJob: mocks.shouldWakeAnalysisJob,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(() => ({
    from: mocks.supabaseFrom,
  })),
}));

vi.mock("@/lib/telemetry/server", () => ({
  logServiceEvent: mocks.logServiceEvent,
}));

const REPORT_ID = "1f03fdfd-89df-44bf-81e3-cb59487276a7";

describe("ResultPageContent pending job wake", () => {
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
      results: [{ completed: false, reportId: REPORT_ID, status: "processing" }],
    });
    mocks.waitUntil.mockImplementation(() => undefined);
    mocks.eq.mockReturnValue({ single: mocks.single });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.supabaseFrom.mockReturnValue({ select: mocks.select });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wakes a pending result job when it is ready to be processed again", async () => {
    mocks.shouldWakeAnalysisJob.mockReturnValue(true);
    mocks.single.mockResolvedValue({ data: pendingReport({ status: "retrying" }), error: null });

    const result = await ResultPageContent({ id: REPORT_ID, requestedLocale: "ko" });

    expect(result).toBeTruthy();
    expect(mocks.shouldWakeAnalysisJob).toHaveBeenCalledWith(expect.objectContaining({ id: REPORT_ID, status: "retrying" }));
    expect(mocks.drainAnalysisQueue).toHaveBeenCalledWith({ targetId: REPORT_ID });
    expect(mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });

  it("does not wake pending jobs that are not ready yet", async () => {
    mocks.shouldWakeAnalysisJob.mockReturnValue(false);
    mocks.single.mockResolvedValue({ data: pendingReport({ status: "retrying" }), error: null });

    const result = await ResultPageContent({ id: REPORT_ID, requestedLocale: "ko" });

    expect(result).toBeTruthy();
    expect(mocks.drainAnalysisQueue).not.toHaveBeenCalled();
    expect(mocks.waitUntil).not.toHaveBeenCalled();
  });
});

function pendingReport({ status }: { status: "queued" | "processing" | "retrying" | "analyzing" }) {
  return {
    id: REPORT_ID,
    created_at: "2026-04-30T01:39:18.845499+09:00",
    expires_at: "2026-05-07T01:39:18.389+09:00",
    gender: "male",
    locale: "ko",
    status,
    retry_after: "2026-04-30T01:39:39.343+09:00",
    locked_until: null,
    face_image_path: `${REPORT_ID}/manual-upload.jpg`,
    report_sections_json: null,
    analysis_source: "manual_upload",
    analysis_tone: "balanced",
  };
}
