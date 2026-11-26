// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Composer } from "./App";
import { bridge } from "./bridge";

vi.mock("./bridge", () => ({
  native: true,
  bridge: { draft: vi.fn(async () => ""), saveDraft: vi.fn(async () => {}) },
  branch: vi.fn(),
  errorText: String,
}));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.clearAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
const conversationId = "00000000-0000-4000-8000-000000000001";
async function renderComposer(onSend = vi.fn(async () => true)) {
  await act(async () =>
    root.render(
      <Composer
        conversationId={conversationId}
        connections={[
          {
            id: "connection",
            name: "Test",
            provider: "openai",
            default_model: "test",
          },
        ]}
        connectionId="connection"
        onConnection={() => {}}
        busy={false}
        onStop={() => {}}
        onConnect={() => {}}
        onSend={onSend}
        onError={() => {}}
      />,
    ),
  );
  return host.querySelector("textarea")!;
}
describe("draft persistence regression", () => {
  it("flushes Vietnamese text when navigating before the debounce deadline", async () => {
    const area = await renderComposer();
    const value = "Bản nháp tiếng Việt chưa kịp autosave.";
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(area, value);
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(bridge.saveDraft).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    expect(bridge.saveDraft).toHaveBeenCalledWith(conversationId, value);
    // afterEach can safely unmount a root that has already been unmounted.
  });
  it("restores a saved draft without altering Unicode", async () => {
    vi.mocked(bridge.draft).mockResolvedValueOnce("Đang viết dở ✓");
    const area = await renderComposer();
    expect(area.value).toBe("Đang viết dở ✓");
  });
  it("does not submit while the user is composing with an IME", async () => {
    const send = vi.fn(async () => true);
    const area = await renderComposer(send);
    await act(async () => {
      area.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          isComposing: true,
          bubbles: true,
        }),
      );
    });
    expect(send).not.toHaveBeenCalled();
  });
});
