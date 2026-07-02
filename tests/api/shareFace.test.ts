import { Blob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  storageFrom: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  download: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(() => ({
    from: mocks.supabaseFrom,
    storage: { from: mocks.storageFrom },
  })),
}));

import { GET } from "@/app/api/share-face/[id]/route";

describe("GET /api/share-face/[id]", () => {
  beforeEach(() => {
    mocks.single.mockResolvedValue({
      data: {
        id: "report-1",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        status: "complete",
        face_image_path: "report-1/original.jpg",
      },
      error: null,
    });
    mocks.eq.mockReturnValue({ single: mocks.single });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.supabaseFrom.mockReturnValue({ select: mocks.select });
    mocks.download.mockResolvedValue({
      data: new Blob([Buffer.from("original-image")], { type: "image/jpeg" }),
      error: null,
    });
    mocks.storageFrom.mockReturnValue({ download: mocks.download });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serves the original uploaded face image", async () => {
    const response = await GET(new Request("https://example.com/api/share-face/report-1"), { params: { id: "report-1" } });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(mocks.download).toHaveBeenCalledWith("report-1/original.jpg");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("original-image");
  });

  it("does not expose expired report images", async () => {
    mocks.single.mockResolvedValueOnce({
      data: {
        id: "report-1",
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        status: "complete",
        face_image_path: "report-1/original.jpg",
      },
      error: null,
    });

    const response = await GET(new Request("https://example.com/api/share-face/report-1"), { params: { id: "report-1" } });

    expect(response.status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("serves allowlisted permanent share images after report expiry", async () => {
    mocks.single.mockResolvedValueOnce({
      data: {
        id: "55c6cf35-ed8b-46e3-b9dc-7a6122b87712",
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        status: "complete",
        face_image_path: "55c6cf35-ed8b-46e3-b9dc-7a6122b87712/manual-upload.jpg",
      },
      error: null,
    });

    const response = await GET(new Request("https://example.com/api/share-face/55c6cf35-ed8b-46e3-b9dc-7a6122b87712"), {
      params: { id: "55c6cf35-ed8b-46e3-b9dc-7a6122b87712" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(mocks.download).toHaveBeenCalledWith("55c6cf35-ed8b-46e3-b9dc-7a6122b87712/manual-upload.jpg");
  });
});
