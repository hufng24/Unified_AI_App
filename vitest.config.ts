import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "apps/desktop/src/**/*.test.tsx"],
    environment: "node",
    testTimeout: 10000,
  },
});
