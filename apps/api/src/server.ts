import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { chatSchema, providerSchema } from "@uai/contracts";
import { providerStream, ProviderError, urls } from "./adapters.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "@uai/contracts";

export function createServer(
  options: {
    token?: string;
    dbPath?: string;
    issuer?: string;
    fetcher?: typeof fetch;
  } = {},
) {
  const token = options.token ?? process.env.UAI_GATEWAY_TOKEN;
  const issuer = options.issuer ?? process.env.SUPABASE_JWT_ISSUER;
  if (!token && !issuer)
    throw new Error(
      "Set UAI_GATEWAY_TOKEN for local development or SUPABASE_JWT_ISSUER.",
    );
  if (process.env.NODE_ENV === "production" && !issuer)
    throw new Error("Production requires Supabase JWT authentication.");
  const jwks = issuer
    ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
    : null;
  const db = new DatabaseSync(options.dbPath ?? ":memory:");
  db.exec(
    "CREATE TABLE IF NOT EXISTS requests(owner TEXT,id TEXT,hash TEXT,status TEXT,created_at TEXT,PRIMARY KEY(owner,id))",
  );
  db.prepare(
    "UPDATE requests SET status='unknown' WHERE status='running'",
  ).run();
  db.prepare("DELETE FROM requests WHERE created_at < ?").run(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );
  const app = Fastify({
    logger: false,
    bodyLimit: 1024 * 1024,
    requestTimeout: 310000,
  });
  app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  app.decorateRequest("owner", "");
  app.addHook("preHandler", async (req, reply) => {
    if (req.url === "/health/live") return;
    const auth = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    if (issuer && jwks) {
      try {
        const result = await jwtVerify(auth, jwks, {
          issuer,
          audience: "authenticated",
        });
        if (!result.payload.sub) throw new Error();
        (req as any).owner = result.payload.sub;
        return;
      } catch {
        reply.code(401).send({
          error: {
            code: "SESSION_EXPIRED",
            message: "Phiên đăng nhập không hợp lệ.",
            retryable: false,
          },
        });
        return;
      }
    }
    const a = Buffer.from(auth),
      b = Buffer.from(token ?? "");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      reply.code(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Gateway yêu cầu xác thực.",
          retryable: false,
        },
      });
      return;
    }
    (req as any).owner = "local-development";
  });
  app.setErrorHandler((error, _req, reply) => {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    reply.code(status || 500).send({
      error: {
        code: "REQUEST_ERROR",
        message: "Yêu cầu không hợp lệ hoặc dịch vụ chưa sẵn sàng.",
        retryable: false,
      },
    });
  });
  app.get("/health/live", async () => ({
    status: "ok",
    mode: issuer ? "cloud-auth" : "local-development",
  }));
  app.get("/v1/status", async () => ({ ready: true }));
  app.post("/v1/connections/test", async (req, reply) => {
    const parsed = z
      .object({
        provider: providerSchema,
        model: z.string().regex(/^[\w.:-]{1,120}$/),
      })
      .strict()
      .safeParse(req.body);
    const key = req.headers["x-provider-key"];
    if (!parsed.success || typeof key !== "string" || !key || key.length > 4096)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Thiếu provider, model hoặc Key.",
          retryable: false,
        },
      });
    const { provider, model } = parsed.data;
    const url =
      provider === "google"
        ? `${urls.google}/models/${encodeURIComponent(model)}`
        : `${urls[provider]}/models/${encodeURIComponent(model)}`;
    const headers: Record<string, string> =
      provider === "openai"
        ? { Authorization: `Bearer ${key}` }
        : provider === "anthropic"
          ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
          : { "x-goog-api-key": key };
    try {
      const r = await (options.fetcher ?? fetch)(url, {
        headers: headers as Record<string, string>,
        signal: AbortSignal.timeout(10000),
      });
      await r.body?.cancel();
      return reply.code(r.ok ? 200 : 422).send(
        r.ok
          ? { valid: true, model_available: true }
          : {
              error: {
                code: "CONNECTION_TEST_FAILED",
                message: "Không truy cập được model. Kiểm tra Key và model ID.",
                retryable: false,
              },
            },
      );
    } catch {
      return reply.code(502).send({
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "Chưa kết nối được provider.",
          retryable: true,
        },
      });
    }
  });
  const active = new Map<string, AbortController>();
  app.post(
    "/v1/chat/completions",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = chatSchema.safeParse(req.body);
      const key = req.headers["x-provider-key"];
      if (
        !parsed.success ||
        typeof key !== "string" ||
        !key ||
        key.length > 4096
      )
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Request hoặc API Key không hợp lệ.",
            retryable: false,
          },
        });
      const input = parsed.data;
      const owner = (req as any).owner as string;
      if (req.headers["idempotency-key"] !== input.request_id)
        return reply.code(400).send({
          error: {
            code: "IDEMPOTENCY_REQUIRED",
            message: "Thiếu mã chống gửi lặp.",
            retryable: false,
          },
        });
      const hash = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
      const prior = db
        .prepare("SELECT hash,status FROM requests WHERE owner=? AND id=?")
        .get(owner, input.request_id) as
        { hash: string; status: string } | undefined;
      if (prior)
        return reply.code(409).send({
          error: {
            code:
              prior.hash !== hash
                ? "IDEMPOTENCY_KEY_REUSED"
                : "GENERATION_EXISTS",
            message: "Lượt này đã được nhận; không tự tạo thêm yêu cầu AI.",
            retryable: false,
          },
          status: prior.status,
        });
      if (
        [...active.keys()].filter((k) => k.startsWith(`${owner}:`)).length >= 2
      )
        return reply.code(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Tối đa hai phản hồi đồng thời.",
            retryable: true,
          },
        });
      db.prepare("INSERT INTO requests VALUES (?,?,?,?,?)").run(
        owner,
        input.request_id,
        hash,
        "running",
        new Date().toISOString(),
      );
      const controller = new AbortController();
      const activeId = `${owner}:${input.request_id}`;
      active.set(activeId, controller);
      const deadline = setTimeout(() => controller.abort(), 300000);
      let seq = 0;
      let status = "failed";
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      });
      const send = (e: object) => {
        if (!reply.raw.destroyed)
          reply.raw.write(
            `event: ${(e as any).type}\ndata: ${JSON.stringify({ ...e, request_id: input.request_id, seq: ++seq })}\n\n`,
          );
      };
      const heartbeat = setInterval(() => {
        if (!reply.raw.destroyed) reply.raw.write(": heartbeat\n\n");
      }, 15000);
      reply.raw.on("close", () => controller.abort());
      try {
        send({ type: "generation.started" });
        for await (const e of providerStream(
          input,
          key,
          controller.signal,
          options.fetcher,
        )) {
          send(e);
          if (e.type === "generation.completed") status = "completed";
        }
      } catch (error) {
        status = controller.signal.aborted ? "cancelled" : "failed";
        send({
          type:
            status === "cancelled"
              ? "generation.cancelled"
              : "generation.failed",
          code:
            error instanceof ProviderError
              ? error.code
              : "PROVIDER_UNAVAILABLE",
          message:
            status === "cancelled"
              ? "Đã dừng phản hồi."
              : "Không hoàn tất phản hồi. Kiểm tra kết nối, Key và hạn mức provider.",
        });
      } finally {
        clearInterval(heartbeat);
        clearTimeout(deadline);
        active.delete(activeId);
        db.prepare("UPDATE requests SET status=? WHERE owner=? AND id=?").run(
          status,
          owner,
          input.request_id,
        );
        reply.raw.end();
      }
    },
  );
  app.addHook("onClose", async () => {
    for (const c of active.values()) c.abort();
    db.close();
  });
  return app;
}
