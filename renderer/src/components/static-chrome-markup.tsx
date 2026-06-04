import type { ThemeMode } from "@/config/renderer-config";
import { StaticChromePopover } from "@/components/chrome/static-chrome-popover";
import { ChromeThemePanel } from "@/components/chrome/chrome-theme-panel";
import { ChromeLocalePanel } from "@/components/chrome/chrome-locale-panel";
import { IconLanguages, IconPalette } from "@/components/chrome/chrome-icons";
import type { AirpDocument } from "@/lib/airp-schema";
import { tRenderer, localeDisplayName, themePresetLabel } from "@/lib/renderer-i18n";
import type { ThemePreset } from "@/lib/themes";

export interface StaticChromeMarkupProps {
  doc: AirpDocument;
  uiLocale: string;
  activeLocale: string;
  themePreset: ThemePreset;
  colorMode: ThemeMode;
  localeMode?: "all" | "single";
}

export function StaticChromeMarkup({
  doc,
  uiLocale,
  activeLocale,
  themePreset,
  colorMode,
  localeMode = "all",
}: StaticChromeMarkupProps) {
  const locales = doc.i18n.locales;

  return (
    <header
      className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-md"
      id="airp-chrome"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div
          className="font-semibold text-sm tracking-tight"
          data-airp-i18n="app-title"
        >
          {tRenderer(uiLocale, "appTitle")}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <StaticChromePopover
            ariaLabel={tRenderer(uiLocale, "themeMenu")}
            icon={<IconPalette className="text-muted-foreground" />}
            id="airp-theme-popover"
            interaction="hover"
            title={themePresetLabel(uiLocale, themePreset)}
            triggerAttributes={{ "data-airp-theme-trigger": true }}
          >
            <div data-airp-control="theme">
              <ChromeThemePanel
                colorMode={colorMode}
                themePreset={themePreset}
                uiLocale={uiLocale}
              />
            </div>
          </StaticChromePopover>
          {localeMode === "all" && (
            <StaticChromePopover
              ariaLabel={tRenderer(uiLocale, "localeMenu")}
              icon={<IconLanguages className="text-muted-foreground" />}
              id="airp-locale-popover"
              interaction="hover"
              title={localeDisplayName(activeLocale)}
              triggerAttributes={{ "data-airp-locale-trigger": true }}
            >
              <div data-airp-control="locale">
                <ChromeLocalePanel
                  activeLocale={activeLocale}
                  locales={locales}
                  uiLocale={uiLocale}
                />
              </div>
            </StaticChromePopover>
          )}
        </div>
      </div>
    </header>
  );
}
