import { mkdirSync } from "node:fs";
import { createServer } from "./server.js";
mkdirSync(".data", { recursive: true, mode: 0o700 });
const app = createServer({ dbPath: ".data/gateway.sqlite" });
// Local gateway is intentionally loopback-only; cloud deployment is a separate milestone.
await app.listen({
  host: "127.0.0.1",
  port: Number(process.env.UAI_API_PORT ?? 8787),
});
console.log(
  "UAI Gateway ready at http://127.0.0.1:8787 (request bodies and keys are never logged)",
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    void app.close();
  });
