import { LocaleMenu } from "@/components/locale-menu";
import { ThemeAppearanceMenu } from "@/components/theme-appearance-menu";
import { Button } from "@/components/ui/button";
import type { AirpDocument } from "@/lib/airp-schema";
import type { ThemePreset } from "@/lib/themes";
import { tRenderer } from "@/lib/renderer-i18n";
import { Download, Upload } from "lucide-react";

export type ReportToolbarProps = {
  doc: AirpDocument | null;
  uiLocale: string;
  locale: string;
  onLocaleChange: (locale: string) => void;
  themePreset: ThemePreset;
  onThemePresetChange: (preset: ThemePreset) => void;
  onFileSelect: (file: File) => void;
  onExportHtml?: () => void;
  parseError?: string | null;
  showUpload?: boolean;
};

export function ReportToolbar({
  doc,
  uiLocale,
  locale,
  onLocaleChange,
  themePreset,
  onThemePresetChange,
  onFileSelect,
  onExportHtml,
  parseError,
  showUpload = true,
}: ReportToolbarProps) {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="font-semibold text-sm tracking-tight">
          {tRenderer(uiLocale, "appTitle")}
        </div>

        {showUpload ? (
          <>
            <Button
              onClick={() => document.getElementById("airp-file-input")?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Upload className="mr-1.5 size-4" />
              {tRenderer(uiLocale, "uploadJson")}
            </Button>
            <input
              accept=".json,application/json"
              className="sr-only"
              id="airp-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileSelect(file);
                }
                e.target.value = "";
              }}
              type="file"
            />
          </>
        ) : null}

        {doc && onExportHtml ? (
          <Button onClick={onExportHtml} size="sm" variant="secondary">
            <Download className="mr-1.5 size-4" />
            {tRenderer(uiLocale, "exportHtml")}
          </Button>
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
      {parseError ? (
        <div className="border-destructive/30 border-t bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {parseError}
        </div>
      ) : null}
    </header>
  );
}
