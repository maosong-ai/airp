import { rendererConfig, type ThemeMode } from "@/config/renderer-config";
import type { ThemePreset } from "@/lib/themes";
import { detectSystemLocale } from "@/lib/i18n";
import { matchLocaleInList } from "@/lib/locale-match";
import { THEME_PRESETS } from "@/lib/themes";

function readStorage(key: string): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export function readStoredUiLocale(): string | null {
  const raw = readStorage(rendererConfig.storageKeys.uiLocale);
  return raw
    ? matchLocaleInList(raw, rendererConfig.locales)
    : null;
}

export function writeStoredUiLocale(locale: string): void {
  const matched = matchLocaleInList(locale, rendererConfig.locales);
  if (!matched) {
    return;
  }
  writeStorage(rendererConfig.storageKeys.uiLocale, matched);
}

export function readStoredTheme(): ThemePreset | null {
  const raw = readStorage(rendererConfig.storageKeys.theme);
  if (raw && THEME_PRESETS.includes(raw as ThemePreset)) {
    return raw as ThemePreset;
  }
  return null;
}

export function writeStoredTheme(preset: ThemePreset): void {
  writeStorage(rendererConfig.storageKeys.theme, preset);
}

export function readStoredThemeMode(): ThemeMode | null {
  const raw = readStorage(rendererConfig.storageKeys.themeMode);
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }
  return null;
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  writeStorage(rendererConfig.storageKeys.themeMode, mode);
}

/** UI chrome locale when no document is loaded (or for UI copy). */
export function resolveUiLocale(): string {
  const stored = readStoredUiLocale();
  if (stored) {
    return stored;
  }
  const fromSystem = matchLocaleInList(
    detectSystemLocale(),
    rendererConfig.locales
  );
  if (fromSystem) {
    return fromSystem;
  }
  return rendererConfig.defaultLocale;
}

export function resolveInitialTheme(): ThemePreset {
  return readStoredTheme() ?? rendererConfig.defaultTheme;
}

/** Reader skin: optional override → localStorage → rendererConfig.defaultTheme */
export function resolveThemePreset(override?: ThemePreset | null): ThemePreset {
  if (override) {
    return override;
  }
  return resolveInitialTheme();
}

export function resolveInitialThemeMode(): ThemeMode {
  return readStoredThemeMode() ?? rendererConfig.defaultThemeMode;
}
