import type { ThemePreset } from "@/lib/themes";

/** Renderer chrome settings (locales, storage keys, defaults). Adjust here to extend. */
export const rendererConfig = {
  locales: [
    "ja-JP",
    "zh-CN",
    "ko-KR",
    "en",
    "de-DE",
    "fr-FR",
    "ru-RU",
    "es-ES",
    "pt-BR",
    "it-IT",
  ] as const,
  defaultLocale: "en" as const,
  defaultTheme: "default" as ThemePreset,
  defaultThemeMode: "system" as const,
  storageKeys: {
    uiLocale: "airp-ui-locale",
    theme: "airp-theme",
    themeMode: "airp-theme-mode",
  },
} as const;

export type RendererLocale = (typeof rendererConfig.locales)[number];
export type ThemeMode = "light" | "dark" | "system";
