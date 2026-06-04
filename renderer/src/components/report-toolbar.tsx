import { ExportMenu } from "@/components/export-menu";
import { LocaleMenu } from "@/components/locale-menu";
import { ThemeAppearanceMenu } from "@/components/theme-appearance-menu";
import { Button } from "@/components/ui/button";
import type { AirpDocument } from "@/lib/airp-schema";
import { tRenderer } from "@/lib/renderer-i18n";
import type { ThemePreset } from "@/lib/themes";
import type { RenderTarget } from "@/pipeline/types";
import { Upload } from "lucide-react";

export type ReportToolbarProps = {
  doc: AirpDocument | null;
  uiLocale: string;
  locale: string;
  onLocaleChange: (locale: string) => void;
  themePreset: ThemePreset;
  onThemePresetChange: (preset: ThemePreset) => void;
  onFileSelect?: (file: File) => void;
  onExportMarkdown?: (locale: string) => void;
  onExportHtmlAll?: () => void;
  onExportHtmlSingle?: (locale: string) => void;
  exporting?: RenderTarget | null;
  parseError?: string | null;
};

export function ReportToolbar({
  doc,
  uiLocale,
  locale,
  onLocaleChange,
  themePreset,
  onThemePresetChange,
  onFileSelect,
  onExportMarkdown,
  onExportHtmlAll,
  onExportHtmlSingle,
  exporting,
  parseError,
}: ReportToolbarProps) {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="font-semibold text-sm tracking-tight">
          {tRenderer(uiLocale, "appTitle")}
        </div>

        {doc ? (
          <>
            <Button
              onClick={() =>
                document.getElementById("airp-reupload-input")?.click()
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <Upload className="mr-1.5 size-4" />
              {tRenderer(uiLocale, "reuploadJson")}
            </Button>
            <input
              accept=".json,.airp.json,application/json"
              className="sr-only"
              id="airp-reupload-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect?.(file);
                }
                e.target.value = "";
              }}
              type="file"
            />
            {onExportMarkdown || onExportHtmlAll || onExportHtmlSingle ? (
              <ExportMenu
                doc={doc}
                exporting={exporting}
                onExportMarkdown={onExportMarkdown}
                onExportHtmlAll={onExportHtmlAll}
                onExportHtmlSingle={onExportHtmlSingle}
                uiLocale={uiLocale}
              />
            ) : null}
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <ThemeAppearanceMenu
            onThemePresetChange={onThemePresetChange}
            themePreset={themePreset}
            uiLocale={uiLocale}
          />
          <LocaleMenu
            doc={doc}
            onChange={onLocaleChange}
            uiLocale={uiLocale}
            value={locale}
          />
        </div>
      </div>
      {parseError && doc ? (
        <div className="border-destructive/30 border-t bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {parseError}
        </div>
      ) : null}
    </header>
  );
}
