import type { AirpDocument } from "@/lib/airp-schema";
import {
  resolveDocumentLocale,
  resolveInitialTheme,
  resolveRendererLocale,
  resolveRendererUiLocale,
  writeStoredLocale,
  writeStoredTheme,
} from "@/lib/preferences";
import type { ThemePreset } from "@/lib/themes";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useReportChrome(initialDoc?: AirpDocument | null) {
  const [doc, setDoc] = useState<AirpDocument | null>(initialDoc ?? null);
  const [locale, setLocale] = useState(() =>
    initialDoc
      ? resolveDocumentLocale(initialDoc, resolveRendererLocale())
      : resolveRendererLocale()
  );
  const [themePreset, setThemePreset] = useState<ThemePreset>(resolveInitialTheme);

  const uiLocale = useMemo(
    () => resolveRendererUiLocale(locale),
    [locale]
  );

  useEffect(() => {
    document.documentElement.dataset.preset = themePreset;
    writeStoredTheme(themePreset);
  }, [themePreset]);

  const loadDocument = useCallback((parsed: AirpDocument) => {
    setDoc(parsed);
    const preferred = resolveRendererLocale();
    setLocale(resolveDocumentLocale(parsed, preferred));
  }, []);

  const handleLocaleChange = useCallback((next: string) => {
    setLocale(next);
    writeStoredLocale(next);
  }, []);

  const handleThemePresetChange = useCallback((preset: ThemePreset) => {
    setThemePreset(preset);
  }, []);

  return {
    doc,
    setDoc,
    locale,
    uiLocale,
    themePreset,
    loadDocument,
    handleLocaleChange,
    handleThemePresetChange,
  };
}
