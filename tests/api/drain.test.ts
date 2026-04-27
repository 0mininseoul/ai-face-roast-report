import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { drainAnalysisQueue } from "@/lib/analysis/jobRunner";
import { GET } from "@/app/api/analyze/drain/route";

vi.mock("@/lib/analysis/jobRunner", () => ({
  drainAnalysisQueue: vi.fn(),
}));

vi.mock("@/lib/telemetry/server", () => ({
  logServiceEvent: vi.fn(),
}));

const drainMock = vi.mocked(drainAnalysisQueue);

describe("GET /api/analyze/drain", () => {
  afterEach(() => {
    drainMock.mockReset();
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthorized cron requests when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await GET(new NextRequest("https://example.com/api/analyze/drain"));

    expect(response.status).toBe(401);
    expect(drainMock).not.toHaveBeenCalled();
  });

  it("drains the queue for authorized cron requests", async () => {
    process.env.CRON_SECRET = "secret";
    drainMock.mockResolvedValue({
      attempted: 1,
      claimed: 1,
      completed: 1,
      failed: 0,
      retrying: 0,
      skipped: 0,
      durationMs: 10,
      remainingBudgetMs: 1000,
      results: [{ completed: true, reportId: "report-1", status: "complete" }],
    });

    const response = await GET(new NextRequest("https://example.com/api/analyze/drain", { headers: { authorization: "Bearer secret" } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(drainMock).toHaveBeenCalledWith({ targetId: null });
    expect(body.completed).toBe(1);
  });
});
