import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedbackButton } from "@/components/result/FeedbackButton";

describe("FeedbackButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("portals the modal to body so fixed positioning is viewport-relative", () => {
    render(
      createElement(
        "header",
        { "data-testid": "result-header", className: "backdrop-blur-xl" },
        createElement(FeedbackButton, { reportId: "report-1" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "개발자에게 의견 보내기" }));

    const header = screen.getByTestId("result-header");
    const dialog = screen.getByRole("dialog", { name: "개발자에게 의견 보내기" });

    expect(dialog.parentElement).toBe(document.body);
    expect(header).not.toContainElement(dialog);
  });
});
