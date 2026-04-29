import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualAnalysisClient } from "@/components/manual-analysis/ManualAnalysisClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ManualAnalysisClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps admin note out of the public manual analysis page", () => {
    render(createElement(ManualAnalysisClient));

    expect(screen.getByRole("heading", { name: "이미지 업로드 분석" })).toBeInTheDocument();
    expect(screen.getByText("매운 맛 (주의)")).toBeInTheDocument();
    expect(screen.getByText("객관적 평가")).toBeInTheDocument();
    expect(screen.queryByText("Admin note")).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("keeps the admin note only in admin mode", () => {
    render(createElement(ManualAnalysisClient, { mode: "admin" }));

    expect(screen.getByText("Admin note")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
