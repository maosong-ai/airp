import { defineConfig } from "vitest/config";
import { vitestConfig } from "../../vitest.shared";

export default defineConfig({
  test: vitestConfig("render-service"),
});
