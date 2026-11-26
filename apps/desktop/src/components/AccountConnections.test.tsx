// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import AccountConnections from "./AccountConnections";
import { bridge } from "../bridge";
import type { AccountLoginResult } from "@uai/contracts";

vi.mock("../bridge", () => ({
  native: true,
  errorText: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  bridge: {
    accountConfig: vi.fn(async () => ({
      google_client_id: null,
      google_quota_project: null,
    })),
    connectAccount: vi.fn(),
    cancelAccountLogin: vi.fn(async () => {}),
    accountHelp: vi.fn(async () => {}),
    accountModels: vi.fn(),
    selectAccountModel: vi.fn(),
    deleteConnection: vi.fn(),
  },
}));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function mount(onConnected = vi.fn(async () => {})) {
  const onApi = vi.fn();
  await act(async () =>
    root.render(
      <AccountConnections
        connections={[]}
        onConnected={onConnected}
        onChanged={async () => {}}
        onApi={onApi}
        onNotice={() => {}}
      />,
    ),
  );
  return { onConnected, onApi };
}
function button(text: string, scope: ParentNode = host) {
  const found = [...scope.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
async function openChatGPT() {
  await act(async () => button("Continue with ChatGPT").click());
  return host.querySelector('[role="dialog"]')!;
}
describe("account connection UX", () => {
  it("offers actual ChatGPT and Google flows without pretending to support Claude subscription login", async () => {
    const { onApi } = await mount();
    expect(host.textContent).toContain("không dùng hạn mức gói Gemini cá nhân");
    expect(host.textContent).toContain("Chưa có quyền cấp đăng nhập claude.ai");
    expect(
      [...host.querySelectorAll("button")].some((b) =>
        b.textContent?.includes("Continue with Claude"),
      ),
    ).toBe(false);
    await act(async () => button("Kết nối Claude API").click());
    expect(onApi).toHaveBeenCalledWith("anthropic");
  });
  it("marks the selected account only after native verification completes", async () => {
    let resolve!: (value: AccountLoginResult) => void;
    vi.mocked(bridge.connectAccount).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }) as ReturnType<typeof bridge.connectAccount>,
    );
    const { onConnected } = await mount();
    const modal = await openChatGPT();
    await act(async () => button("Continue with ChatGPT", modal).click());
    expect(onConnected).not.toHaveBeenCalled();
    expect(modal.textContent).toContain("chờ xác minh");
    await act(async () =>
      resolve({
        connection_id: "verified-account",
        models: [{ id: "allowed-model", name: "Allowed model" }],
      }),
    );
    expect(onConnected).toHaveBeenCalledWith("verified-account");
  });
  it("keeps failed authorization disconnected and displays the native validation error", async () => {
    vi.mocked(bridge.connectAccount).mockRejectedValueOnce(
      new Error("Nonce không khớp"),
    );
    const { onConnected } = await mount();
    const modal = await openChatGPT();
    await act(async () => button("Continue with ChatGPT", modal).click());
    expect(onConnected).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Nonce không khớp",
    );
  });
  it("cancels an in-progress native sign-in when Escape closes the modal", async () => {
    vi.mocked(bridge.connectAccount).mockImplementation(
      () => new Promise(() => {}),
    );
    const { onConnected } = await mount();
    const modal = await openChatGPT();
    await act(async () => button("Continue with ChatGPT", modal).click());
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(bridge.cancelAccountLogin).toHaveBeenCalledTimes(1);
    expect(onConnected).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
