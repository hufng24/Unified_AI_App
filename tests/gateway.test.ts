import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { chatSchema, type ChatRequest } from "../packages/contracts/src/index";
import {
  normalize,
  parseSSE,
  providerStream,
  upstream,
} from "../apps/api/src/adapters";
import { createServer } from "../apps/api/src/server";

function request(): ChatRequest {
  return {
    request_id: randomUUID(),
    conversation_id: randomUUID(),
    user_message_id: randomUUID(),
    assistant_message_id: randomUUID(),
    connection_id: randomUUID(),
    provider: "openai",
    model: "test-model",
    context: {
      schema_version: 1,
      instructions: "Answer in Vietnamese",
      messages: [
        { role: "user", content: [{ type: "text", text: "Xin chào" }] },
        { role: "assistant", content: [{ type: "text", text: "Chào bạn" }] },
        { role: "user", content: [{ type: "text", text: "Tiếp tục" }] },
      ],
      sources: [],
      snapshot_hash: "test",
    },
    max_output_tokens: 32,
    stream: true,
  };
}
const fixture =
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Xin chào"}\n\nevent: response.completed\ndata: {"type":"response.completed","response":{"usage":{"input_tokens":8,"output_tokens":3}}}\n\n';
describe("contracts and provider normalization", () => {
  it("rejects unknown fields and arbitrary model paths", () => {
    expect(
      chatSchema.safeParse({ ...request(), api_key: "secret" }).success,
    ).toBe(false);
    expect(
      chatSchema.safeParse({ ...request(), model: "../../admin" }).success,
    ).toBe(false);
  });
  it("keeps instruction separate and remaps Gemini assistant role", () => {
    const r = request();
    r.provider = "google";
    const u = upstream(r, "canary-key");
    expect((u.body as any).contents[1].role).toBe("model");
    expect(JSON.stringify(u.body)).not.toContain("canary-key");
    expect(u.url).toContain("generativelanguage.googleapis.com");
  });
  it("decodes split Unicode and CRLF at every possible byte boundary", async () => {
    const bytes = new TextEncoder().encode(
      'event: text\r\ndata: {"text":"Tiếng Việt ✓"}\r\n\r\n',
    );
    for (let split = 1; split < bytes.length; split++) {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(bytes.slice(0, split));
          c.enqueue(bytes.slice(split));
          c.close();
        },
      });
      const frames = [];
      for await (const e of parseSSE(body)) frames.push(e);
      expect(frames).toEqual([
        { event: "text", data: '{"text":"Tiếng Việt ✓"}' },
      ]);
    }
  });
  it("does not mark a truncated upstream stream completed", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
        ),
    );
    const events = [];
    await expect(async () => {
      for await (const e of providerStream(
        request(),
        "canary",
        new AbortController().signal,
        fetcher as typeof fetch,
      ))
        events.push(e);
    }).rejects.toThrow("INCOMPLETE_PROVIDER_STREAM");
    expect(events).toEqual([{ type: "text.delta", text: "partial" }]);
  });
  it("normalizes Claude text and usage independently", () => {
    expect(
      normalize("anthropic", "message", {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "hello" },
      }),
    ).toEqual([{ type: "text.delta", text: "hello" }]);
    expect(
      normalize("anthropic", "message", {
        type: "message_delta",
        usage: { output_tokens: 10 },
      }),
    ).toEqual([{ type: "usage.updated", output_tokens: 10 }]);
  });
  it("blocks safety responses and does not expose model thoughts", () => {
    expect(() =>
      normalize("google", "message", {
        promptFeedback: { blockReason: "SAFETY" },
      }),
    ).toThrow("PROVIDER_SAFETY_BLOCK");
    expect(
      normalize("google", "message", {
        candidates: [
          {
            content: {
              parts: [{ text: "private", thought: true }, { text: "answer" }],
            },
            finishReason: "STOP",
          },
        ],
      }),
    ).toEqual([
      { type: "text.delta", text: "answer" },
      { type: "generation.completed", finish_reason: "stop" },
    ]);
  });
});
describe("gateway authorization idempotency and redaction", () => {
  it("rejects unauthenticated calls before contacting provider", async () => {
    const fetcher = vi.fn();
    const app = createServer({ token: "test", fetcher });
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: request(),
    });
    expect(response.statusCode).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    await app.close();
  });
  it("streams once, prevents duplicate billing and rejects a reused id with a different body", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(fixture, {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    const app = createServer({
      token: "test",
      fetcher: fetcher as typeof fetch,
    });
    const r = request();
    const headers = {
      authorization: "Bearer test",
      "x-provider-key": "canary-key",
      "idempotency-key": r.request_id,
    };
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: r,
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Xin chào");
    expect(response.body).toContain("generation.completed");
    expect(response.body).not.toContain("canary-key");
    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: r,
      headers,
    });
    expect(duplicate.statusCode).toBe(409);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const changed = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: { ...r, max_output_tokens: 64 },
      headers,
    });
    expect(changed.json().error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    await app.close();
  });
  it("never returns raw upstream error contents or keys", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("canary-provider-key private upstream detail", {
          status: 401,
        }),
    );
    const app = createServer({
      token: "test",
      fetcher: fetcher as typeof fetch,
    });
    const r = request();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: r,
      headers: {
        authorization: "Bearer test",
        "x-provider-key": "canary-provider-key",
        "idempotency-key": r.request_id,
      },
    });
    expect(response.body).toContain("PROVIDER_KEY_INVALID");
    expect(response.body).not.toContain("canary-provider-key");
    expect(response.body).not.toContain("private upstream detail");
    expect(response.body).not.toContain("generation.completed");
    await app.close();
  });
});
