/**
 * Static exported HTML: theme / locale chrome (no React, no AIRP JSON).
 */
(function () {
  const configEl = document.getElementById("airp-chrome-config");
  if (!configEl?.textContent) {
    return;
  }
  const config = JSON.parse(configEl.textContent);
  const root = document.documentElement;
  const panels = () => Array.from(document.querySelectorAll("[data-airp-locale]"));
  const popoverRoots = () =>
    Array.from(document.querySelectorAll("[data-airp-popover-root]"));

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  }

  function normalizeLocale(code) {
    const parts = String(code).split(/[-_]/);
    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }

  function matchLocaleInList(preferred, candidates) {
    if (!candidates?.length) {
      return null;
    }
    const norm = normalizeLocale(preferred);
    const exact = candidates.find((l) => normalizeLocale(l) === norm);
    if (exact) {
      return exact;
    }
    const langOnly = norm.split("-")[0];
    return (
      candidates.find((l) => normalizeLocale(l).split("-")[0] === langOnly) ??
      null
    );
  }

  function resolveUiLocale(docLocale) {
    return (
      matchLocaleInList(docLocale, config.rendererLocales) ??
      config.defaultRendererLocale
    );
  }

  function chromeTable(uiLocale) {
    return (
      config.chromeI18n?.[uiLocale] ??
      config.chromeI18n?.[config.defaultRendererLocale]
    );
  }

  function setText(el, value) {
    if (el && typeof value === "string") {
      el.textContent = value;
    }
  }

  function updateChromeUi(docLocale) {
    const table = chromeTable(resolveUiLocale(docLocale));
    if (!table) return;

    setText(document.querySelector("#airp-chrome [data-airp-i18n='app-title']"), table.appTitle);

    const i18nMap = {
      "theme-preset-section": table.themePresetSection,
      "theme-mode-section": table.themeModeSection,
      "locale-menu": table.localeMenu,
    };
    for (const [key, value] of Object.entries(i18nMap)) {
      for (const el of document.querySelectorAll(`#airp-chrome [data-airp-i18n="${key}"]`)) {
        setText(el, value);
      }
    }

    // Preset swatches: title + aria-label
    for (const btn of document.querySelectorAll("[data-airp-preset]")) {
      const preset = btn.getAttribute("data-airp-preset");
      const label = preset ? table.themePresets?.[preset] : null;
      if (!label) continue;
      btn.setAttribute("title", label);
      btn.setAttribute("aria-label", label);
    }

    // Mode buttons: title + aria-label
    const modeLabels = {
      light: table.colorLight,
      dark: table.colorDark,
      system: table.colorSystem,
    };
    for (const btn of document.querySelectorAll("[data-airp-mode]")) {
      const mode = btn.getAttribute("data-airp-mode");
      const label = mode ? modeLabels[mode] : null;
      if (!label) continue;
      btn.setAttribute("title", label);
      btn.setAttribute("aria-label", label);
    }

    // Theme trigger title (include current preset label if possible)
    const themeTrigger = document.querySelector("[data-airp-theme-trigger]");
    if (themeTrigger) {
      const preset = root.dataset.preset;
      const presetLabel = preset ? table.themePresets?.[preset] : null;
      const title = presetLabel ? `${table.themeMenu}: ${presetLabel}` : table.themeMenu;
      themeTrigger.setAttribute("title", title);
      themeTrigger.setAttribute("aria-label", table.themeMenu);
    }
  }

  function syncActiveUi(state) {
    const { preset, colorMode, locale } = state;

    for (const el of document.querySelectorAll("[data-airp-preset]")) {
      const v = el.getAttribute("data-airp-preset");
      el.setAttribute("aria-pressed", String(v === preset));
    }
    for (const el of document.querySelectorAll("[data-airp-mode]")) {
      const v = el.getAttribute("data-airp-mode");
      el.setAttribute("aria-pressed", String(v === colorMode));
    }
    for (const el of document.querySelectorAll("[data-airp-locale-option]")) {
      const v = el.getAttribute("data-airp-locale-option");
      el.setAttribute("aria-pressed", String(v === locale));
    }
  }

  function applyColorMode(mode) {
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle(
        "dark",
        matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
  }

  function applyThemePreset(preset) {
    root.dataset.preset = preset;
  }

  function getTitle(locale) {
    // Infer title from document meta if available
    // This is typically set by the application, but we may need to compute it here
    const docTitle = document.title;
    // For now, keep the title as is (set by SSR)
    // In a future iteration, you could pass docMeta in config if needed
    return docTitle;
  }

  function applyLocale(locale) {
    for (const panel of panels()) {
      const on = panel.getAttribute("data-airp-locale") === locale;
      panel.hidden = !on;
    }
    // Update html lang and title based on contentLocale
    root.lang = locale;
    // Note: Title update would require doc meta in config; 
    // for now SSR sets it correctly and this applies dynamically
    updateChromeUi(locale);
    const visible = document.querySelector(
      `[data-airp-locale="${locale}"]:not([hidden])`
    );
    if (visible && typeof window.__airpRefreshDiagrams === "function") {
      window.__airpRefreshDiagrams(visible);
    }
  }

  function closeAllPopovers() {
    for (const r of popoverRoots()) {
      const trigger = r.querySelector("[data-airp-popover-trigger]");
      const panel = r.querySelector("[data-airp-popover-panel]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (panel) {
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        panel.setAttribute("data-airp-open", "false");
      }
    }
  }

  function togglePopover(rootEl, nextOpen) {
    const trigger = rootEl.querySelector("[data-airp-popover-trigger]");
    const panel = rootEl.querySelector("[data-airp-popover-panel]");
    if (!trigger || !panel) return;

    const isOpen = trigger.getAttribute("aria-expanded") === "true";
    const open = typeof nextOpen === "boolean" ? nextOpen : !isOpen;

    if (open) closeAllPopovers();

    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    panel.setAttribute("data-airp-open", open ? "true" : "false");
  }

  function resolveLocale() {
    // First check stored contentLocale
    const stored = readStorage(config.storageKeys.contentLocale);
    if (stored && config.locales.includes(stored)) {
      return stored;
    }

    // all mode: match browser language to doc locales
    const browserLang =
      navigator.language ||
      navigator.userLanguage;
    const fromBrowser = matchLocaleInList(browserLang, config.locales);
    if (fromBrowser) {
      return fromBrowser;
    }

    // Fallback to exportLocale (SSR default)
    return config.exportLocale;
  }

  function resolvePreset() {
    const stored = readStorage(config.storageKeys.theme);
    if (stored && config.themePresets.includes(stored)) {
      return stored;
    }
    return config.exportTheme;
  }

  function resolveColorMode() {
    const stored = readStorage(config.storageKeys.themeMode);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return config.exportColorMode;
  }

  let preset = resolvePreset();
  let colorMode = resolveColorMode();
  // activeLocale is used by preset/mode handlers for UI refresh
  let activeLocale = config.exportLocale;

  // single mode: locale is fixed at SSR value; skip locale logic entirely
  if (config.localeMode !== "single") {
    activeLocale = resolveLocale();
    applyLocale(activeLocale);
    syncActiveUi({ locale: activeLocale, preset, colorMode });

    // Wire locale buttons
    for (const btn of document.querySelectorAll("[data-airp-locale-option]")) {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-airp-locale-option");
        if (!v) return;
        applyLocale(v);
        writeStorage(config.storageKeys.contentLocale, v);
        activeLocale = v;
        syncActiveUi({ locale: activeLocale, preset, colorMode });
        closeAllPopovers();
      });
    }
  } else {
    // single mode: apply UI chrome strings for the fixed locale
    updateChromeUi(activeLocale);
    syncActiveUi({ locale: activeLocale, preset, colorMode });
  }

  applyThemePreset(preset);
  applyColorMode(colorMode);

  // Popovers: click to toggle; close on outside click and Escape.
  for (const r of popoverRoots()) {
    const trigger = r.querySelector("[data-airp-popover-trigger]");
    if (!trigger) continue;
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover(r);
    });
  }
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("[data-airp-popover-root]")) return;
    closeAllPopovers();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllPopovers();
  });

  // Wire preset buttons
  for (const btn of document.querySelectorAll("[data-airp-preset]")) {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-airp-preset");
      if (!v) return;
      applyThemePreset(v);
      writeStorage(config.storageKeys.theme, v);
      preset = v;
      syncActiveUi({ locale: activeLocale, preset, colorMode });
      updateChromeUi(activeLocale);
      closeAllPopovers();
    });
  }

  // Wire mode buttons
  for (const btn of document.querySelectorAll("[data-airp-mode]")) {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-airp-mode");
      if (!v) return;
      applyColorMode(v);
      writeStorage(config.storageKeys.themeMode, v);
      colorMode = v;
      syncActiveUi({ locale: activeLocale, preset, colorMode });
      if (typeof window.__airpRefreshDiagrams === "function") {
        const visible = document.querySelector("[data-airp-locale]:not([hidden])");
        if (visible) window.__airpRefreshDiagrams(visible);
      }
      closeAllPopovers();
    });
  }

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const stored = readStorage(config.storageKeys.themeMode);
    if (stored === "system" || (!stored && config.exportColorMode === "system")) {
      applyColorMode("system");
    }
  });
})();
