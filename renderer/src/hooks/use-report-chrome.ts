import type { AirpDocument } from "@/lib/airp-schema";
import { rendererConfig } from "@/config/renderer-config";
import { resolveLocales } from "@/lib/locale-resolution";
import {
  readStoredUiLocale,
  resolveInitialTheme,
  writeStoredUiLocale,
  writeStoredTheme,
} from "@/lib/preferences";
import type { ThemePreset } from "@/lib/themes";
import { useCallback, useEffect, useState } from "react";

function browserLocales(): string[] {
  if (typeof navigator === "undefined") {
    return [];
  }
  const list = Array.isArray(navigator.languages)
    ? navigator.languages
    : [];
  if (list.length > 0) {
    return list;
  }
  return navigator.language ? [navigator.language] : [];
}

function resolveDashboardState(
  doc: AirpDocument | null,
  preferredLocale?: string | null
): { uiLocale: string; contentLocale: string; shouldPersistUiLocale: boolean } {
  const base = {
    rendererLocales: rendererConfig.locales,
    rendererDefaultLocale: rendererConfig.defaultLocale,
    storedUiLocale: readStoredUiLocale(),
    browserLocales: browserLocales(),
  };

  if (!doc) {
    const resolved = resolveLocales({
      mode: "dashboard-empty",
      ...base,
      preferredLocale,
    });
    return {
      uiLocale: resolved.uiLocale,
      contentLocale: resolved.contentLocale,
      shouldPersistUiLocale: resolved.shouldPersistUiLocale,
    };
  }

  const resolved = resolveLocales({
    mode: "dashboard-doc",
    ...base,
    docLocales: doc.i18n.locales,
    docDefaultLocale: doc.i18n.defaultLocale,
    preferredLocale,
  });

  return {
    uiLocale: resolved.uiLocale,
    contentLocale: resolved.contentLocale,
    shouldPersistUiLocale: resolved.shouldPersistUiLocale,
  };
}

export function useReportChrome(initialDoc?: AirpDocument | null) {
  const initialResolved = resolveDashboardState(initialDoc ?? null);
  const [doc, setDoc] = useState<AirpDocument | null>(initialDoc ?? null);
  const [uiLocale, setUiLocale] = useState(initialResolved.uiLocale);
  const [contentLocale, setContentLocale] = useState(initialResolved.contentLocale);
  const [themePreset, setThemePreset] = useState<ThemePreset>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.preset = themePreset;
    writeStoredTheme(themePreset);
  }, [themePreset]);

  useEffect(() => {
    writeStoredUiLocale(uiLocale);
  }, [uiLocale]);

  const loadDocument = useCallback((parsed: AirpDocument) => {
    const resolved = resolveDashboardState(parsed);
    setDoc(parsed);
    setUiLocale(resolved.uiLocale);
    setContentLocale(resolved.contentLocale);
  }, []);

  const handleLocaleChange = useCallback((next: string) => {
    const resolved = resolveDashboardState(doc, next);
    setUiLocale(resolved.uiLocale);
    setContentLocale(resolved.contentLocale);
  }, [doc]);

  const handleThemePresetChange = useCallback((preset: ThemePreset) => {
    setThemePreset(preset);
  }, []);

  return {
    doc,
    setDoc,
    locale: contentLocale,
    uiLocale,
    themePreset,
    loadDocument,
    handleLocaleChange,
    handleThemePresetChange,
  };
}
