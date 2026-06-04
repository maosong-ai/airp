import { DocumentDropZone } from "@/components/document-drop-zone";
import { ReportPage } from "@/components/report-page";
import { ReportToolbar } from "@/components/report-toolbar";
import { useReportChrome } from "@/hooks/use-report-chrome";
import { loadDocumentFromFile } from "@/pipeline/load-document.browser";
import { downloadArtifact } from "@/pipeline/download-artifact.browser";
import { registerBackend, renderDocument } from "@/pipeline/render-document";
import type { RenderTarget } from "@/pipeline/types";
import { tRenderer } from "@/lib/renderer-i18n";
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
  const [exporting, setExporting] = useState<RenderTarget | null>(null);

  const handleFile = async (file: File) => {
    try {
      loadDocument(await loadDocumentFromFile(file));
      setParseError(null);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse AIRP JSON"
      );
    }
  };

  const handleExportMarkdown = useCallback(
    async (locale: string) => {
      if (!doc) {
        return;
      }
      setExporting("markdown");
      setParseError(null);
      try {
        const { markdownBackend } = await import("@/backends/markdown");
        registerBackend(markdownBackend);
        const artifact = await renderDocument(doc, "markdown", {
          locale,
        });
        downloadArtifact(artifact);
      } catch (err) {
        setParseError(
          err instanceof Error
            ? err.message
            : tRenderer(uiLocale, "exportFailed")
        );
      } finally {
        setExporting(null);
      }
    },
    [doc, uiLocale]
  );

  const handleExportHtmlAll = useCallback(
    async () => {
      if (!doc) {
        return;
      }
      setExporting("html");
      setParseError(null);
      try {
        const { htmlBackendBrowser } = await import("@/backends/html/html-backend.browser");
        registerBackend(htmlBackendBrowser);
        const artifact = await renderDocument(doc, "html", {
          locale: doc.i18n.defaultLocale,
          themePreset,
          localeMode: "all",
        });
        downloadArtifact(artifact);
      } catch (err) {
        setParseError(
          err instanceof Error
            ? err.message
            : tRenderer(uiLocale, "exportFailed")
        );
      } finally {
        setExporting(null);
      }
    },
    [doc, themePreset, uiLocale]
  );

  const handleExportHtmlSingle = useCallback(
    async (locale: string) => {
      if (!doc) {
        return;
      }
      setExporting("html");
      setParseError(null);
      try {
        const { htmlBackendBrowser } = await import("@/backends/html/html-backend.browser");
        registerBackend(htmlBackendBrowser);
        const artifact = await renderDocument(doc, "html", {
          locale,
          themePreset,
          localeMode: "single",
        });
        downloadArtifact(artifact);
      } catch (err) {
        setParseError(
          err instanceof Error
            ? err.message
            : tRenderer(uiLocale, "exportFailed")
        );
      } finally {
        setExporting(null);
      }
    },
    [doc, themePreset, uiLocale]
  );

  if (!doc) {
    return (
      <>
        <ReportToolbar
          doc={null}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          onThemePresetChange={handleThemePresetChange}
          themePreset={themePreset}
          uiLocale={uiLocale}
        />
        <DocumentDropZone
          onFileSelect={handleFile}
          parseError={parseError}
          uiLocale={uiLocale}
        />
      </>
    );
  }

  return (
    <>
      <ReportToolbar
        doc={doc}
        exporting={exporting}
        locale={locale}
        onExportMarkdown={handleExportMarkdown}
        onExportHtmlAll={handleExportHtmlAll}
        onExportHtmlSingle={handleExportHtmlSingle}
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
