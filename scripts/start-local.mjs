import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const api = join(root, "apps/api");
const target = join(root, "apps/desktop/src-tauri/target");
const candidates = ["release", "debug"].map((profile) =>
  process.platform === "darwin"
    ? join(
        target,
        profile,
        "bundle/macos/Unified AI Workspace.app/Contents/MacOS/unified-ai-workspace",
      )
    : join(
        target,
        profile,
        `unified-ai-workspace${process.platform === "win32" ? ".exe" : ""}`,
      ),
);
const binary = candidates.find(existsSync);
if (!binary)
  throw new Error(
    "Build desktop first: pnpm --filter @uai/desktop tauri build --debug",
  );
const port = process.env.UAI_API_PORT ?? "8787";
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  UAI_GATEWAY_TOKEN: token,
  UAI_API_BASE: `http://127.0.0.1:${port}`,
  UAI_API_PORT: port,
};
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300).unref();
}
const gateway = spawn(
  process.execPath,
  [
    "--import",
    pathToFileURL(join(api, "node_modules/tsx/dist/loader.mjs")).href,
    join(api, "src/main.ts"),
  ],
  { cwd: api, env, stdio: "inherit" },
);
children.push(gateway);
gateway.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
let ready = false;
for (let attempt = 0; attempt < 50 && !closing; attempt++) {
  try {
    const response = await fetch(`${env.UAI_API_BASE}/v1/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) {
      ready = true;
      break;
    }
    if (response.status === 401)
      throw new Error(
        "Port already in use by a different gateway. Close the previous launcher.",
      );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Port already")) {
      console.error(error.message);
      stop(1);
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!ready) {
  if (!closing)
    console.error("Gateway did not start. Check the port and dependencies.");
  stop(1);
} else if (!closing) {
  const desktop = spawn(binary, [], { cwd: root, env, stdio: "inherit" });
  children.push(desktop);
  desktop.on("exit", (code) => stop(code ?? 0));
  console.log(
    "Local workspace started. Close the app or press Ctrl C to stop.",
  );
}
