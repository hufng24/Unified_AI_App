import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = {
  ...process.env,
  UAI_GATEWAY_TOKEN:
    process.env.UAI_GATEWAY_TOKEN ?? randomBytes(32).toString("hex"),
  UAI_API_BASE: process.env.UAI_API_BASE ?? "http://127.0.0.1:8787",
};
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run this launcher with pnpm dev");
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}
for (const args of [
  ["--filter", "@uai/api", "dev"],
  ["--filter", "@uai/desktop", "tauri", "dev"],
]) {
  const child = spawn(process.execPath, [pnpm, ...args], {
    env,
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code) => stop(code ?? 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
