import { renderServicePlugin } from "@airp/render-service/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // The preview pane renders through the shared service, so what it shows is the
  // same bytes `airp-render` writes. See `@airp/render-service`.
  plugins: [renderServicePlugin()],
  build: { outDir: "dist" },
});
