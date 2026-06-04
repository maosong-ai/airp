import { readStoredThemeMode, resolveThemePreset } from "@/lib/preferences";
import { artifactFilename } from "@/pipeline/artifact-filename";
import type { RenderBackend } from "@/pipeline/types";
import { fetchExportCss } from "./export-css.browser";
import { fetchStaticExportScripts } from "./export-scripts.browser";
import { renderStaticHtml } from "./static-html";

export const htmlBackendBrowser: RenderBackend = {
  format: "html",
  async render(doc, ctx) {
    if (!doc.i18n.locales.includes(ctx.locale)) {
      throw new Error(
        `locale "${ctx.locale}" not in document locales: ${doc.i18n.locales.join(", ")}`
      );
    }
    const [css, scripts] = await Promise.all([
      fetchExportCss(),
      fetchStaticExportScripts(),
    ]);
    const localeMode = ctx.localeMode ?? "all";
    const body = renderStaticHtml({
      doc,
      locale: ctx.locale,
      css,
      mermaidInitJs: scripts.mermaidInitJs,
      chromeJs: scripts.chromeJs,
      themePreset: resolveThemePreset(ctx.themePreset),
      colorMode: ctx.colorMode ?? readStoredThemeMode() ?? "system",
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
