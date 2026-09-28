import { renderServicePlugin } from "@airp/render-service/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // The preview pane renders through the shared service, so what it shows is
    // the same bytes `airp-render` writes. See `@airp/render-service`.
    //
    // `rendererRoot` is only useful while the Renderer is a sibling in this
    // repository: it lets the plugin warn when the compiled entry is older than
    // the sources, which is otherwise a silent way to render stale bytes. Drop
    // it once this app depends on a published `@airp/renderer`.
    renderServicePlugin({
      rendererRoot: "../../packages/renderer-target-html",
    }),
  ],
  build: { outDir: "dist" },
});
