import { defineConfig } from "vitest/config";
import { vitestConfig } from "../../vitest.shared";

export default defineConfig({
  test: {
    ...vitestConfig("airp-notion"),
    // The browser case drives a real Vite server and Chromium.
    testTimeout: 90_000,
  },
});
