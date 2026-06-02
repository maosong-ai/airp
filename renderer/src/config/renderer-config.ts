import type { ThemePreset } from "@/lib/themes";

/** Renderer chrome settings (locales, storage keys, defaults). Adjust here to extend. */
export const rendererConfig = {
  locales: ["ja-JP", "zh-CN", "en"] as const,
  defaultLocale: "ja-JP",
  defaultTheme: "default" as ThemePreset,
  defaultThemeMode: "system" as const,
  storageKeys: {
    locale: "airp-renderer-locale",
    theme: "airp-renderer-theme",
    themeMode: "airp-renderer-theme-mode",
  },
} as const;

export type RendererLocale = (typeof rendererConfig.locales)[number];
export type ThemeMode = "light" | "dark" | "system";
