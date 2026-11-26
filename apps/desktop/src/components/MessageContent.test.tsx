// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect } from "vitest";
import MessageContent, { svgImage, safeImage } from "./MessageContent";
describe("inline generated images", () => {
  it("previews complete SVG without injecting markup into application DOM", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <MessageContent
          text={
            '```svg\n<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="green"/></svg>\n```'
          }
        />,
      ),
    );
    expect(host.querySelector("img")?.src).toContain("data:image/svg+xml");
    expect(host.querySelector("svg")).toBeNull();
    expect(host.querySelector("details")?.textContent).toContain("Xem mã SVG");
    await act(async () => host.querySelector("button")!.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => root.unmount());
    host.remove();
  });
  it("rejects active SVG, external references and incomplete streams", () => {
    for (const source of [
      "<svg><script>alert(1)</script></svg>",
      '<svg><image href="https://tracker.test/a"/></svg>',
      '<svg onload="alert(1)"></svg>',
      "<svg><rect/>",
    ])
      expect(svgImage(source)).toBeNull();
    expect(
      svgImage(
        '<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>',
      ),
    ).toBeTruthy();
  });
  it("allows embedded raster images and refuses remote image tracking", () => {
    expect(safeImage("data:image/png;base64,YWJj")).toBeTruthy();
    expect(safeImage("https://tracker.test/p.png")).toBeUndefined();
    expect(safeImage("data:text/html;base64,YWJj")).toBeUndefined();
  });
});
