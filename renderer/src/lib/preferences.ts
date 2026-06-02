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

export function readStoredLocale(): string | null {
  const raw = readStorage(rendererConfig.storageKeys.locale);
  return raw
    ? matchLocaleInList(raw, rendererConfig.locales)
    : null;
}

export function writeStoredLocale(locale: string): void {
  writeStorage(rendererConfig.storageKeys.locale, locale);
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

/** Renderer chrome locale when no document is loaded (or for UI copy). */
export function resolveRendererLocale(): string {
  const stored = readStoredLocale();
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

/**
 * Document content locale after loading JSON.
 * Keeps current preference when supported; otherwise system, then doc default.
 */
export function resolveDocumentLocale(
  doc: AirpDocument,
  currentPreference: string
): string {
  const docLocales = doc.i18n.locales;
  const inDoc = matchLocaleInList(currentPreference, docLocales);
  if (inDoc) {
    return inDoc;
  }
  const fromSystem = matchLocaleInList(detectSystemLocale(), docLocales);
  if (fromSystem) {
    return fromSystem;
  }
  return doc.i18n.defaultLocale;
}

/** Best renderer UI locale for toolbar strings given active document locale. */
export function resolveRendererUiLocale(docLocale: string): string {
  return (
    matchLocaleInList(docLocale, rendererConfig.locales) ??
    resolveRendererLocale()
  );
}
