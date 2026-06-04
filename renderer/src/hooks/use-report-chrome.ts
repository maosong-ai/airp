import type { AirpDocument } from "@/lib/airp-schema";
import {
  resolveContentLocale,
  resolveInitialTheme,
  resolveUiLocale,
  writeStoredContentLocale,
  writeStoredTheme,
} from "@/lib/preferences";
import type { ThemePreset } from "@/lib/themes";
import { useCallback, useEffect, useState } from "react";

export function useReportChrome(initialDoc?: AirpDocument | null) {
  const [doc, setDoc] = useState<AirpDocument | null>(initialDoc ?? null);
  const [uiLocale] = useState(() => resolveUiLocale());
  const [contentLocale, setContentLocale] = useState(() =>
    resolveContentLocale(initialDoc ?? null, resolveUiLocale())
  );
  const [themePreset, setThemePreset] = useState<ThemePreset>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.preset = themePreset;
    writeStoredTheme(themePreset);
  }, [themePreset]);

  const loadDocument = useCallback((parsed: AirpDocument) => {
    setDoc(parsed);
    setContentLocale(resolveContentLocale(parsed, uiLocale));
  }, [uiLocale]);

  const handleLocaleChange = useCallback((next: string) => {
    setContentLocale(next);
    writeStoredContentLocale(next);
  }, []);

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
