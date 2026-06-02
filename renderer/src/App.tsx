import { ReportPage } from "@/components/report-page";
import { ReportToolbar } from "@/components/report-toolbar";
import { useReportChrome } from "@/hooks/use-report-chrome";
import { parseAirpDocument } from "@/lib/airp-schema";
import { readStoredThemeMode } from "@/lib/preferences";
import { tRenderer } from "@/lib/renderer-i18n";
import { fetchExportCss } from "@/lib/static-export-css.browser";
import { fetchStaticExportScripts } from "@/lib/static-export-scripts.browser";
import { renderStaticHtml } from "@/lib/static-html";
import { useCallback, useState } from "react";

export default function App() {
  const {
    doc,
    locale,
    uiLocale,
    themePreset,
    loadDocument,
    handleLocaleChange,
    handleThemePresetChange,
  } = useReportChrome();
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      loadDocument(parseAirpDocument(json));
      setParseError(null);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse AIRP JSON"
      );
    }
  };

  const handleExportHtml = useCallback(async () => {
    if (!doc) {
      return;
    }
    try {
      const [css, scripts] = await Promise.all([
        fetchExportCss(),
        fetchStaticExportScripts(),
      ]);
      const html = renderStaticHtml({
        doc,
        locale,
        css,
        mermaidInitJs: scripts.mermaidInitJs,
        chromeJs: scripts.chromeJs,
        themePreset,
        colorMode: readStoredThemeMode() ?? "system",
        interactive: true,
      });
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "report.html";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to export HTML"
      );
    }
  }, [doc, locale, themePreset]);

  if (!doc) {
    return (
      <>
        <ReportToolbar
          doc={null}
          locale={locale}
          onFileSelect={handleFile}
          onLocaleChange={handleLocaleChange}
          onThemePresetChange={handleThemePresetChange}
          parseError={parseError}
          themePreset={themePreset}
          uiLocale={uiLocale}
        />
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-bold text-2xl">
            {tRenderer(uiLocale, "emptyHint")}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {tRenderer(uiLocale, "emptyHintDetail")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ReportToolbar
        doc={doc}
        locale={locale}
        onExportHtml={handleExportHtml}
        onFileSelect={handleFile}
        onLocaleChange={handleLocaleChange}
        onThemePresetChange={handleThemePresetChange}
        parseError={parseError}
        themePreset={themePreset}
        uiLocale={uiLocale}
      />
      <div id="airp-report">
        <ReportPage doc={doc} locale={locale} />
      </div>
    </>
  );
}
