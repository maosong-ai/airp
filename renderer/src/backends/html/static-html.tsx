import { renderToStaticMarkup } from "react-dom/server";
import { ReportPage } from "@/components/report-page";
import { StaticChromeMarkup } from "@/components/static-chrome-markup";
import type { ThemeMode } from "@/config/renderer-config";
import type { AirpDocument } from "@/lib/airp-schema";
import { escapeInlineScript } from "@/lib/inline-script";
import { resolveThemePreset } from "@/lib/preferences";
import {
  resolveRendererUiLocaleForSsr,
} from "@/lib/locale-resolution";
import { buildStaticChromeI18n } from "@/lib/renderer-i18n";
import { rendererConfig } from "@/config/renderer-config";
import { THEME_PRESETS, type ThemePreset } from "@/lib/themes";

export type StaticHtmlOptions = {
  doc: AirpDocument;
  locale: string;
  css: string;
  mermaidInitJs: string;
  chromeJs: string;
  themePreset?: ThemePreset;
  colorMode?: ThemeMode;
  localeMode?: "all" | "single";
};

export function renderStaticHtml({
  doc,
  locale,
  css,
  mermaidInitJs,
  chromeJs,
  themePreset,
  colorMode = "system",
  localeMode = "all",
}: StaticHtmlOptions): string {

  const preset = resolveThemePreset(themePreset);
  const ssrLocale = localeMode === "all" ? doc.i18n.defaultLocale : locale;
  const uiLocale = resolveRendererUiLocaleForSsr(
    ssrLocale,
    rendererConfig.locales,
    rendererConfig.defaultLocale
  );
  const locales = doc.i18n.locales;
  const titleByLocale = Object.fromEntries(
    locales.map((loc) => [loc, getTitle(doc, loc)])
  );

  const chromeConfig = {
    storageKeys: rendererConfig.storageKeys,
    locales,
    exportLocale: ssrLocale,
    documentDefaultLocale: doc.i18n.defaultLocale,
    titleByLocale,
    localeMode,
    themePresets: [...THEME_PRESETS],
    exportTheme: preset,
    exportColorMode: colorMode,
    rendererLocales: [...rendererConfig.locales],
    defaultRendererLocale: rendererConfig.defaultLocale,
    chromeI18n: buildStaticChromeI18n(),
  };

  // all mode: render all locale panels; single mode: render only the single locale panel
  const localePanels = localeMode === "all"
    ? locales
        .map((loc) => {
          const hidden = loc !== doc.i18n.defaultLocale;
          const markup = renderToStaticMarkup(
            <ReportPage doc={doc} locale={loc} showToc staticMermaid />
          );
          return `<div data-airp-locale="${escapeHtml(loc)}"${hidden ? " hidden" : ""}>${markup}</div>`;
        })
        .join("\n")
    : renderToStaticMarkup(
        <ReportPage doc={doc} locale={ssrLocale} showToc staticMermaid />
      );

  // Chrome shell always rendered; locale switcher visibility controlled by localeMode
  const chromeMarkup = renderToStaticMarkup(
    <StaticChromeMarkup
      activeLocale={ssrLocale}
      colorMode={colorMode}
      doc={doc}
      localeMode={localeMode}
      themePreset={preset}
      uiLocale={uiLocale}
    />
  );

  const body = `${chromeMarkup}
  <script id="airp-chrome-config" type="application/json">${serializeJson(chromeConfig)}</script>
  <div id="airp-report">${localePanels}</div>`;

  const darkClass =
    colorMode === "dark" ? ' class="dark"' : colorMode === "system" ? "" : "";

  const chromeScript = `<script defer>\n${escapeInlineScript(chromeJs)}\n</script>\n  `;
  const mermaidScript = `<script type="module">\n${escapeInlineScript(mermaidInitJs)}\n</script>`;
  const scripts = `${chromeScript}${mermaidScript}`;

  return `<!DOCTYPE html>
<html lang="${ssrLocale}" data-preset="${preset}"${darkClass}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(getTitle(doc, ssrLocale))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  ${body}
  ${scripts}
</body>
</html>`;
}

function getTitle(doc: AirpDocument, locale: string): string {
  const t = doc.meta.title;
  if (typeof t === "string") {
    return t;
  }
  return t[locale] ?? t[doc.i18n.defaultLocale] ?? "AIRP Report";
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\u003e");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
