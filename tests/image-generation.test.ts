import { describe, it, expect } from "vitest";
import { upstream, normalize, providerStream } from "../apps/api/src/adapters";
import type { ChatRequest } from "@uai/contracts";
const request = {
  provider: "openai",
  model: "account-model",
  auth_mode: "chatgpt",
  image_generation: true,
  context: {
    instructions: "Draw the requested poster",
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: "Tạo ảnh một khu vườn" }],
      },
    ],
  },
  max_output_tokens: 2048,
} as ChatRequest;
describe("image generation tool", () => {
  it("forces the real tool only when image mode is selected", () => {
    const image = upstream(request, "secret").body as any;
    expect(image.tools).toEqual([
      { type: "image_generation", output_format: "png" },
    ]);
    expect(image.tool_choice).toEqual({ type: "image_generation" });
    expect(
      (upstream({ ...request, image_generation: false }, "secret").body as any)
        .tools,
    ).toBeUndefined();
  });
  it("translates completed image bytes to a persistable inline image", () => {
    const result = normalize("openai", "response.output_item.done", {
      type: "response.output_item.done",
      item: {
        type: "image_generation_call",
        status: "completed",
        result: "aGVsbG8=",
        output_format: "png",
      },
    });
    expect(result[0].text).toContain(
      "![Ảnh do AI tạo](data:image/png;base64,aGVsbG8=)",
    );
  });
  it("rejects unsafe image payloads and unexpected formats", () => {
    for (const item of [
      { result: "https://tracking.test" },
      { result: "YWJj", output_format: "svg" },
    ])
      expect(() =>
        normalize("openai", "", {
          type: "response.output_item.done",
          item: { type: "image_generation_call", status: "completed", ...item },
        }),
      ).toThrow("INVALID_IMAGE_RESULT");
  });
  it("does not send image tools or secrets to another provider", async () => {
    const fetcher = () => {
      throw new Error("must not call upstream");
    };
    await expect(async () => {
      for await (const _ of providerStream(
        { ...request, provider: "anthropic" },
        "secret",
        new AbortController().signal,
        fetcher as any,
      )) {
      }
    }).rejects.toThrow("IMAGE_PROVIDER_UNSUPPORTED");
  });
});
