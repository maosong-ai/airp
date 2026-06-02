import {
  ToolbarHoverMenu,
} from "@/components/toolbar-hover-menu";
import { ChromeThemePanel } from "@/components/chrome/chrome-theme-panel";
import { IconPalette } from "@/components/chrome/chrome-icons";
import type { ThemeMode } from "@/config/renderer-config";
import type { ThemePreset } from "@/lib/themes";
import { tRenderer, themePresetLabel } from "@/lib/renderer-i18n";
import { useTheme } from "next-themes";

export interface ThemeAppearanceMenuProps {
  uiLocale: string;
  themePreset: ThemePreset;
  onThemePresetChange: (preset: ThemePreset) => void;
}

export function ThemeAppearanceMenu({
  uiLocale,
  themePreset,
  onThemePresetChange,
}: ThemeAppearanceMenuProps) {
  const { theme, setTheme } = useTheme();
  const mode = (theme ?? "system") as ThemeMode;

  return (
    <ToolbarHoverMenu
      align="end"
      ariaLabel={tRenderer(uiLocale, "themeMenu")}
      contentClassName="min-w-[232px]"
      icon={<IconPalette />}
      title={themePresetLabel(uiLocale, themePreset)}
    >
      <ChromeThemePanel
        colorMode={mode}
        onModeChange={(m) => setTheme(m)}
        onPresetChange={onThemePresetChange}
        themePreset={themePreset}
        uiLocale={uiLocale}
      />
    </ToolbarHoverMenu>
  );
}
