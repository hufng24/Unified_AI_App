// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import ChatGPTShortcut from "./ChatGPTShortcut";
import type { Connection } from "@uai/contracts";
const account: Connection = {
  id: "chatgpt-account",
  provider: "openai",
  name: "ChatGPT",
  default_model: "allowed-model",
  has_key: true,
  auth_mode: "chatgpt",
  account_email: "user@example.test",
};
async function mount(connections: Connection[], busy = false) {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onSelect = vi.fn(),
    onConnect = vi.fn();
  await act(async () =>
    root.render(
      <ChatGPTShortcut
        connections={connections}
        currentId="api-account"
        busy={busy}
        onSelect={onSelect}
        onConnect={onConnect}
      />,
    ),
  );
  return {
    host,
    onSelect,
    onConnect,
    close: async () => {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}
describe("ChatGPT directly in workspace", () => {
  it("selects the saved ChatGPT account instead of opening a web window or using the API account", async () => {
    const v = await mount([
      { ...account, id: "api-account", auth_mode: "api_key" },
      account,
    ]);
    await act(async () => v.host.querySelector("button")!.click());
    expect(v.onSelect).toHaveBeenCalledWith("chatgpt-account");
    expect(v.onConnect).not.toHaveBeenCalled();
    expect(v.host.textContent).toContain("user@example.test");
    await v.close();
  });
  it("routes to sign-in when no usable ChatGPT session exists", async () => {
    for (const accounts of [
      [],
      [{ ...account, needs_reauth: true }],
      [{ ...account, has_key: false }],
    ]) {
      const v = await mount(accounts);
      await act(async () => v.host.querySelector("button")!.click());
      expect(v.onConnect).toHaveBeenCalledOnce();
      expect(v.onSelect).not.toHaveBeenCalled();
      await v.close();
    }
  });
  it("does not switch account during generation", async () => {
    const v = await mount([account], true);
    expect(v.host.querySelector("button")!.disabled).toBe(true);
    await v.close();
  });
});
