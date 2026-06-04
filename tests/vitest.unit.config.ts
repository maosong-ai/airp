import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../renderer/src"),
    },
  },
});
