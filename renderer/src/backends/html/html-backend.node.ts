import { readStoredThemeMode } from "@/lib/preferences";
import { artifactFilename } from "@/pipeline/artifact-filename";
import type { RenderBackend } from "@/pipeline/types";
import { readExportCss } from "./export-css.node";
import { readStaticExportScripts } from "./export-scripts.node";
import { renderStaticHtml } from "./static-html";

export const htmlBackendNode: RenderBackend = {
  format: "html",
  async render(doc, ctx) {
    if (!ctx.rendererRoot) {
      throw new Error("rendererRoot is required for Node HTML export");
    }
    if (!doc.i18n.locales.includes(ctx.locale)) {
      throw new Error(
        `locale "${ctx.locale}" not in document locales: ${doc.i18n.locales.join(", ")}`
      );
    }
    const [css, scripts] = await Promise.all([
      readExportCss(ctx.rendererRoot),
      readStaticExportScripts(ctx.rendererRoot),
    ]);
    const localeMode = ctx.localeMode ?? "all";
    const body = renderStaticHtml({
      doc,
      locale: ctx.locale,
      css,
      mermaidInitJs: scripts.mermaidInitJs,
      chromeJs: scripts.chromeJs,
      themePreset: ctx.themePreset,
      colorMode: ctx.colorMode ?? "system",
      localeMode,
    });
    return {
      format: "html",
      mimeType: "text/html",
      filename: artifactFilename(doc, ctx.locale, "html"),
      body,
    };
  },
};

/** Node CLI: default color mode when not interactive. */
export function resolveNodeColorMode(): "light" | "dark" | "system" {
  return readStoredThemeMode() ?? "system";
}
