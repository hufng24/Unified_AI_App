import type { ChatRequest, NormalizedEvent, Provider } from "@uai/contracts";
export class ProviderError extends Error {
  constructor(
    public code: string,
    public status = 502,
  ) {
    super(code);
  }
}
export const urls = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
};
export function upstream(
  req: ChatRequest,
  key: string,
): { url: string; headers: Record<string, string>; body: unknown } {
  const messages = req.context.messages.map((m) => ({
    role: m.role,
    content: m.content.map((b) => b.text).join("\n"),
  }));
  if (req.provider === "openai")
    return {
      url: `${urls.openai}/responses`,
      headers: { Authorization: `Bearer ${key}` },
      body: {
        model: req.model,
        instructions: req.context.instructions,
        input: messages,
        max_output_tokens: req.max_output_tokens,
        stream: true,
        store: false,
      },
    };
  if (req.provider === "anthropic")
    return {
      url: `${urls.anthropic}/messages`,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: {
        model: req.model,
        system: req.context.instructions,
        messages,
        max_tokens: req.max_output_tokens,
        stream: true,
      },
    };
  return {
    url: `${urls.google}/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`,
    headers: { "x-goog-api-key": key },
    body: {
      systemInstruction: {
        parts: [
          { text: req.context.instructions || "You are a helpful assistant." },
        ],
      },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: req.max_output_tokens },
    },
  };
}
export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      // Normalize CRLF after joining chunks so a split CR LF is still valid.
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 2 * 1024 * 1024)
        throw new ProviderError("INVALID_PROVIDER_STREAM");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        let event = "message";
        const data: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (data.length) yield { event, data: data.join("\n") };
      }
      if (chunk.done) {
        if (buffer.trim() && !buffer.trim().startsWith(":"))
          throw new ProviderError("INCOMPLETE_PROVIDER_STREAM");
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
type EventPart = Omit<NormalizedEvent, "request_id" | "seq">;
// Read only documented text and usage fields. Never expose raw provider errors.
export function normalize(
  provider: Provider,
  event: string,
  v: any,
): EventPart[] {
  if (event === "error" || v.type === "error" || v.error)
    throw new ProviderError("PROVIDER_ERROR");
  if (provider === "openai") {
    if (v.type === "response.output_text.delta")
      return [{ type: "text.delta", text: v.delta }];
    if (v.type === "response.failed") throw new ProviderError("PROVIDER_ERROR");
    if (v.type === "response.completed" || v.type === "response.incomplete")
      return [
        {
          type: "usage.updated",
          input_tokens: v.response?.usage?.input_tokens,
          output_tokens: v.response?.usage?.output_tokens,
        },
        {
          type: "generation.completed",
          finish_reason: v.type === "response.incomplete" ? "length" : "stop",
        },
      ];
  } else if (provider === "anthropic") {
    if (v.type === "content_block_delta" && v.delta?.type === "text_delta")
      return [{ type: "text.delta", text: v.delta.text }];
    if (v.type === "message_start")
      return [
        { type: "usage.updated", input_tokens: v.message?.usage?.input_tokens },
      ];
    if (v.type === "message_delta")
      return [{ type: "usage.updated", output_tokens: v.usage?.output_tokens }];
    if (v.type === "message_stop")
      return [{ type: "generation.completed", finish_reason: "stop" }];
  } else {
    if (v.promptFeedback?.blockReason)
      throw new ProviderError("PROVIDER_SAFETY_BLOCK");
    const c = v.candidates?.[0];
    const events: EventPart[] = [];
    for (const p of c?.content?.parts ?? [])
      if (typeof p.text === "string" && !p.thought)
        events.push({ type: "text.delta", text: p.text });
    if (v.usageMetadata)
      events.push({
        type: "usage.updated",
        input_tokens: v.usageMetadata.promptTokenCount,
        output_tokens: v.usageMetadata.candidatesTokenCount,
      });
    if (c?.finishReason) {
      if (!["STOP", "MAX_TOKENS"].includes(c.finishReason))
        throw new ProviderError("PROVIDER_SAFETY_BLOCK");
      events.push({
        type: "generation.completed",
        finish_reason: c.finishReason === "STOP" ? "stop" : "length",
      });
    }
    return events;
  }
  return [];
}
export async function* providerStream(
  req: ChatRequest,
  key: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): AsyncGenerator<EventPart> {
  const u = upstream(req, key);
  const response = await fetcher(u.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...u.headers },
    body: JSON.stringify(u.body),
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderError(
      response.status === 401 || response.status === 403
        ? "PROVIDER_KEY_INVALID"
        : response.status === 429
          ? "PROVIDER_QUOTA"
          : "PROVIDER_ERROR",
      response.status === 429 ? 429 : 502,
    );
  }
  if (!response.body) throw new ProviderError("EMPTY_PROVIDER_STREAM");
  let terminal = false;
  for await (const frame of parseSSE(response.body)) {
    if (frame.data === "[DONE]") continue;
    let v;
    try {
      v = JSON.parse(frame.data);
    } catch {
      throw new ProviderError("INVALID_PROVIDER_STREAM");
    }
    for (const e of normalize(req.provider, frame.event, v)) {
      if (terminal) continue;
      yield e;
      if (e.type === "generation.completed") {
        terminal = true;
        return;
      }
    }
  }
  if (!terminal) throw new ProviderError("INCOMPLETE_PROVIDER_STREAM");
}
