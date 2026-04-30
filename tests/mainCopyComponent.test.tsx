import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainCopy } from "@/components/result/MainCopy";

let mockedClientWidth = 360;
let restoreClientWidth: (() => void) | null = null;
let restoreScrollWidth: (() => void) | null = null;
let restoreScrollHeight: (() => void) | null = null;

describe("MainCopy", () => {
  beforeEach(() => {
    mockedClientWidth = 360;
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    restoreClientWidth = mockGetter(HTMLElement.prototype, "clientWidth", function clientWidth(this: HTMLElement) {
      return this.tagName === "H1" ? mockedClientWidth : 0;
    });
    restoreScrollWidth = mockGetter(HTMLElement.prototype, "scrollWidth", function scrollWidth(this: HTMLElement) {
      const fontSize = numberFromStyle(this.style.fontSize, 64);
      if (this.style.whiteSpace === "normal") return mockedClientWidth;
      return Math.ceil((this.textContent ?? "").length * fontSize * 0.78);
    });
    restoreScrollHeight = mockGetter(HTMLElement.prototype, "scrollHeight", function scrollHeight(this: HTMLElement) {
      const fontSize = numberFromStyle(this.style.fontSize, 64);
      const lineHeight = numberFromStyle(this.style.lineHeight, fontSize);
      const width = numberFromStyle(this.style.width, mockedClientWidth);
      const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.78)));
      return Math.ceil(Math.ceil((this.textContent ?? "").length / charsPerLine) * lineHeight);
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    restoreClientWidth?.();
    restoreScrollWidth?.();
    restoreScrollHeight?.();
  });

  it("allows mobile main copy to wrap up to two lines", () => {
    const copy = "길에서 번호 한 번쯤은 따이실 법한 얼굴입니다";
    mockedClientWidth = 360;

    render(createElement(MainCopy, { text: copy }));

    const text = screen.getByText(copy);
    expect(text).toHaveStyle({ whiteSpace: "normal" });
    expect(text.style.webkitLineClamp).toBe("2");
    expect(Number.parseFloat(text.style.fontSize)).toBeGreaterThan(18);
  });

  it("keeps desktop main copy on one line", () => {
    const copy = "길에서 번호 한 번쯤은 따이실 법한 얼굴입니다";
    mockedClientWidth = 1024;

    render(createElement(MainCopy, { text: copy }));

    const text = screen.getByText(copy);
    expect(text).toHaveStyle({ whiteSpace: "nowrap" });
    expect(text.style.webkitLineClamp).toBe("");
  });
});

function mockGetter<T>(target: T, property: string, get: () => unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, property);
  Object.defineProperty(target, property, { configurable: true, get });
  return () => {
    if (descriptor) Object.defineProperty(target, property, descriptor);
    else delete (target as Record<string, unknown>)[property];
  };
}

function numberFromStyle(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
