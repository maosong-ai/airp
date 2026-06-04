import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/integration/**/*.test.ts"],
    testTimeout: 120000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../renderer/src"),
    },
  },
});
