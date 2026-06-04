import { rendererConfig, type ThemeMode } from "@/config/renderer-config";
import type { AirpDocument } from "@/lib/airp-schema";
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
  writeStorage(rendererConfig.storageKeys.uiLocale, locale);
}

export function readStoredContentLocale(): string | null {
  const raw = readStorage(rendererConfig.storageKeys.contentLocale);
  return raw ? raw : null;
}

export function writeStoredContentLocale(locale: string): void {
  writeStorage(rendererConfig.storageKeys.contentLocale, locale);
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

/** Document content locale: prefer stored, then match to doc locales. */
export function resolveContentLocale(
  doc: AirpDocument | null,
  uiLocale: string
): string {
  if (!doc) {
    return uiLocale;
  }
  const stored = readStoredContentLocale();
  if (stored && doc.i18n.locales.includes(stored)) {
    return stored;
  }
  // Try to match ui locale to doc locales
  const fromUi = matchLocaleInList(uiLocale, doc.i18n.locales);
  if (fromUi) {
    return fromUi;
  }
  const fromSystem = matchLocaleInList(detectSystemLocale(), doc.i18n.locales);
  if (fromSystem) {
    return fromSystem;
  }
  return doc.i18n.defaultLocale;
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

/** Best renderer UI locale for toolbar strings given active document locale. */
export function resolveRendererUiLocale(docLocale: string): string {
  return (
    matchLocaleInList(docLocale, rendererConfig.locales) ??
    resolveUiLocale()
  );
}
