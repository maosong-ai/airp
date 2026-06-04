import path from "node:path";
import { defineConfig } from "vitest/config";

// Runs all tests: unit + integration.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/unit/**/*.test.ts", "src/integration/**/*.test.ts"],
    testTimeout: 120000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../renderer/src"),
    },
  },
});