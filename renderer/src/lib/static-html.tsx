import { renderToStaticMarkup } from "react-dom/server";
import { ReportPage } from "@/components/report-page";
import { StaticChromeMarkup } from "@/components/static-chrome-markup";
import type { ThemeMode } from "@/config/renderer-config";
import type { AirpDocument } from "@/lib/airp-schema";
import { escapeInlineScript } from "@/lib/inline-script";
import {
  resolveRendererUiLocale,
  resolveThemePreset,
} from "@/lib/preferences";
import { buildStaticChromeI18n } from "@/lib/renderer-i18n";
import { rendererConfig } from "@/config/renderer-config";
import { THEME_PRESETS, type ThemePreset } from "@/lib/themes";

export type StaticHtmlOptions = {
  doc: AirpDocument;
  locale: string;
  css: string;
  mermaidInitJs: string;
  chromeJs?: string;
  themePreset?: ThemePreset;
  colorMode?: ThemeMode;
  /** SSR toolbar + locale panels */
  interactive?: boolean;
};

export function renderStaticHtml({
  doc,
  locale,
  css,
  mermaidInitJs,
  chromeJs,
  themePreset,
  colorMode = "system",
  interactive = true,
}: StaticHtmlOptions): string {
  if (interactive && !chromeJs) {
    throw new Error("chromeJs is required when interactive is true");
  }

  const preset = resolveThemePreset(themePreset);
  const uiLocale = resolveRendererUiLocale(locale);
  const locales = doc.i18n.locales;

  const chromeConfig = {
    storageKeys: rendererConfig.storageKeys,
    locales,
    exportLocale: locale,
    themePresets: [...THEME_PRESETS],
    exportTheme: preset,
    exportColorMode: colorMode,
    rendererLocales: [...rendererConfig.locales],
    defaultRendererLocale: rendererConfig.defaultLocale,
    chromeI18n: buildStaticChromeI18n(),
  };

  const localePanels = locales
    .map((loc) => {
      const hidden = loc !== locale;
      const markup = renderToStaticMarkup(
        <ReportPage doc={doc} locale={loc} showToc staticMermaid />
      );
      return `<div data-airp-locale="${escapeHtml(loc)}"${hidden ? " hidden" : ""}>${markup}</div>`;
    })
    .join("\n");

  const chromeMarkup = interactive
    ? renderToStaticMarkup(
        <StaticChromeMarkup
          activeLocale={locale}
          colorMode={colorMode}
          doc={doc}
          themePreset={preset}
          uiLocale={uiLocale}
        />
      )
    : "";

  const body = interactive
    ? `${chromeMarkup}
  <script id="airp-chrome-config" type="application/json">${serializeJson(chromeConfig)}</script>
  <div id="airp-report">${localePanels}</div>`
    : `<div id="airp-root">${renderToStaticMarkup(
        <ReportPage doc={doc} locale={locale} showToc staticMermaid />
      )}</div>`;

  const darkClass =
    colorMode === "dark" ? ' class="dark"' : colorMode === "system" ? "" : "";
  const systemScript =
    colorMode === "system" && !interactive
      ? `<script>
(function(){
  var d=document.documentElement;
  function apply(){
    d.classList.toggle('dark', matchMedia('(prefers-color-scheme: dark)').matches);
  }
  apply();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
})();
</script>`
      : "";

  const chromeScript = interactive
    ? `<script defer>\n${escapeInlineScript(chromeJs!)}\n</script>\n  `
    : "";
  const mermaidScript = `<script type="module">\n${escapeInlineScript(mermaidInitJs)}\n</script>`;
  const scripts = `${chromeScript}${mermaidScript}`;

  return `<!DOCTYPE html>
<html lang="${locale}" data-preset="${preset}"${darkClass}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(getTitle(doc, locale))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${css}</style>
  ${systemScript}
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
