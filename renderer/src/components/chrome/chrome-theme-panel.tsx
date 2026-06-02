import { ChromeMenuSection } from "@/components/chrome/chrome-menu-section";
import { IconMonitor, IconMoon, IconSun } from "@/components/chrome/chrome-icons";
import type { ThemeMode } from "@/config/renderer-config";
import { tRenderer, themePresetLabel } from "@/lib/renderer-i18n";
import {
  THEME_PRESET_SWATCH,
  THEME_PRESETS,
  type ThemePreset,
} from "@/lib/themes";

const MODE_OPTIONS: {
  mode: ThemeMode;
  icon: typeof IconSun;
  labelKey: "colorLight" | "colorDark" | "colorSystem";
}[] = [
  { mode: "light", icon: IconSun, labelKey: "colorLight" },
  { mode: "dark", icon: IconMoon, labelKey: "colorDark" },
  { mode: "system", icon: IconMonitor, labelKey: "colorSystem" },
];

export interface ChromeThemePanelProps {
  uiLocale: string;
  themePreset: ThemePreset;
  colorMode: ThemeMode;
  onPresetChange?: (preset: ThemePreset) => void;
  onModeChange?: (mode: ThemeMode) => void;
}

export function ChromeThemePanel({
  uiLocale,
  themePreset,
  colorMode,
  onPresetChange,
  onModeChange,
}: ChromeThemePanelProps) {
  return (
    <>
      <ChromeMenuSection
        title={tRenderer(uiLocale, "themePresetSection")}
        titleI18nKey="theme-preset-section"
      >
        <div className="grid grid-cols-3 gap-2 px-1">
          {THEME_PRESETS.map((preset) => {
            const label = themePresetLabel(uiLocale, preset);
            const active = themePreset === preset;
            return (
              <button
                aria-label={label}
                aria-pressed={active}
                className={[
                  "h-10 rounded-md border-2 border-border/80 shadow-sm transition-all",
                  "hover:scale-[1.03] hover:border-muted-foreground/40 hover:shadow-md",
                  "aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/25",
                ].join(" ")}
                data-airp-preset={preset}
                key={preset}
                onClick={
                  onPresetChange ? () => onPresetChange(preset) : undefined
                }
                style={{ background: THEME_PRESET_SWATCH[preset] }}
                title={label}
                type="button"
              />
            );
          })}
        </div>
      </ChromeMenuSection>
      <div className="my-2 border-border border-t" />
      <ChromeMenuSection
        title={tRenderer(uiLocale, "themeModeSection")}
        titleI18nKey="theme-mode-section"
      >
        <div className="flex gap-1.5 px-1">
          {MODE_OPTIONS.map(({ mode, icon: Icon, labelKey }) => {
            const label = tRenderer(uiLocale, labelKey);
            const active = colorMode === mode;
            return (
              <button
                aria-label={label}
                aria-pressed={active}
                className={[
                  "flex flex-1 items-center justify-center rounded-md border border-transparent py-2 transition-colors",
                  "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  "aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary",
                ].join(" ")}
                data-airp-mode={mode}
                key={mode}
                onClick={onModeChange ? () => onModeChange(mode) : undefined}
                title={label}
                type="button"
              >
                <Icon />
              </button>
            );
          })}
        </div>
      </ChromeMenuSection>
    </>
  );
}
