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

  function resolveUiFromRendererChain(storedUiLocale, browserLangs) {
    const candidates = [storedUiLocale, ...browserLangs, config.defaultRendererLocale]
      .filter(Boolean);

    for (const candidate of candidates) {
      const matched = matchLocaleInList(candidate, config.rendererLocales);
      if (matched) {
        return matched;
      }
    }
    return config.defaultRendererLocale;
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

  function updateChromeUi(uiLocale) {
    const table = chromeTable(uiLocale);
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

  function updateLocaleTriggerTitle(locale) {
    const localeTrigger = document.querySelector("[data-airp-locale-trigger]");
    if (!(localeTrigger instanceof HTMLElement)) return;
    const label = document.querySelector(
      `[data-airp-locale-option="${locale}"] [data-airp-locale-label]`
    );
    const text = label?.textContent?.trim();
    if (text) {
      localeTrigger.setAttribute("title", text);
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
    return (
      config.titleByLocale?.[locale] ??
      config.titleByLocale?.[config.documentDefaultLocale] ??
      document.title
    );
  }

  function applyLocale(locale, uiLocale) {
    for (const panel of panels()) {
      const on = panel.getAttribute("data-airp-locale") === locale;
      panel.hidden = !on;
    }
    // Keep html language and title synchronized with active content locale.
    root.lang = locale;
    document.title = getTitle(locale);
    updateChromeUi(uiLocale);
    updateLocaleTriggerTitle(locale);
    const visible = document.querySelector(
      `[data-airp-locale="${locale}"]:not([hidden])`
    );
    if (visible && typeof window.__airpRefreshDiagrams === "function") {
      window.__airpRefreshDiagrams(visible);
    }
  }

  const HOVER_POPOVER_OPEN_DELAY_MS = 0;
  const HOVER_POPOVER_CLOSE_DELAY_MS = 200;
  const hoverPopoverTimers = new WeakMap();

  function clearHoverPopoverTimers(rootEl) {
    const timers = hoverPopoverTimers.get(rootEl);
    if (!timers) return;
    if (timers.open) {
      clearTimeout(timers.open);
      timers.open = null;
    }
    if (timers.close) {
      clearTimeout(timers.close);
      timers.close = null;
    }
  }

  function closePopoverRoot(rootEl) {
    if (rootEl instanceof HTMLElement) {
      clearHoverPopoverTimers(rootEl);
      togglePopover(rootEl, false);
    }
  }

  function closeLocalePopover() {
    const trigger = document.querySelector("[data-airp-locale-trigger]");
    closePopoverRoot(trigger?.closest("[data-airp-popover-root]"));
  }

  function closeAllPopovers() {
    for (const r of popoverRoots()) {
      closePopoverRoot(r);
    }
  }

  function setAllFileTreeNodesOpen(container, open) {
    const nodes = container.querySelectorAll("[data-airp-file-tree-node]");
    for (const node of nodes) {
      if (!(node instanceof HTMLDetailsElement)) continue;
      node.open = open;
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

  function getBrowserLocales() {
    const langs = Array.isArray(navigator.languages)
      ? navigator.languages.filter(Boolean)
      : [];
    if (langs.length > 0) {
      return langs;
    }
    const fallback = navigator.language || navigator.userLanguage;
    return fallback ? [fallback] : [];
  }

  function resolveAllModeLocales(preferredLocale) {
    const storedUiLocale = readStorage(config.storageKeys.uiLocale);
    const browserLangs = getBrowserLocales();
    const contentCandidates = [preferredLocale, storedUiLocale, ...browserLangs, config.documentDefaultLocale]
      .filter(Boolean);

    let contentLocale = config.documentDefaultLocale;
    for (const candidate of contentCandidates) {
      const matched = matchLocaleInList(candidate, config.locales);
      if (matched) {
        contentLocale = matched;
        break;
      }
    }

    const uiLocale =
      matchLocaleInList(contentLocale, config.rendererLocales) ??
      resolveUiFromRendererChain(storedUiLocale, browserLangs);

    return {
      contentLocale,
      uiLocale,
      shouldPersistUiLocale: true,
    };
  }

  function resolveSingleModeUiLocale(singleLocale) {
    const browserLangs = getBrowserLocales();
    const fromSingle = matchLocaleInList(singleLocale, config.rendererLocales);
    if (fromSingle) {
      return fromSingle;
    }
    const fromBrowser = browserLangs
      .map((lang) => matchLocaleInList(lang, config.rendererLocales))
      .find(Boolean);
    return fromBrowser ?? config.defaultRendererLocale;
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
  let activeUiLocale = config.defaultRendererLocale;

  // single mode: locale is fixed at SSR value; skip locale logic entirely
  if (config.localeMode !== "single") {
    const initial = resolveAllModeLocales();
    activeLocale = initial.contentLocale;
    activeUiLocale = initial.uiLocale;
    applyLocale(activeLocale, activeUiLocale);
    if (initial.shouldPersistUiLocale) {
      writeStorage(config.storageKeys.uiLocale, activeUiLocale);
    }
    syncActiveUi({ locale: activeLocale, preset, colorMode });

    document.addEventListener("click", (e) => {
      const option = e.target.closest("[data-airp-locale-option]");
      if (!(option instanceof HTMLElement)) return;

      const v = option.getAttribute("data-airp-locale-option");
      if (!v) return;

      e.preventDefault();
      e.stopPropagation();
      closeLocalePopover();

      const next = resolveAllModeLocales(v);
      activeLocale = next.contentLocale;
      activeUiLocale = next.uiLocale;
      applyLocale(activeLocale, activeUiLocale);
      if (next.shouldPersistUiLocale) {
        writeStorage(config.storageKeys.uiLocale, activeUiLocale);
      }
      syncActiveUi({ locale: activeLocale, preset, colorMode });
    });
  } else {
    // single mode: locale is fixed and language storage is ignored.
    activeLocale = config.exportLocale;
    activeUiLocale = resolveSingleModeUiLocale(activeLocale);
    updateChromeUi(activeUiLocale);
    syncActiveUi({ locale: activeLocale, preset, colorMode });
  }

  function wireHoverPopover(rootEl) {
    if (!(rootEl instanceof HTMLElement)) return;

    const trigger = rootEl.querySelector("[data-airp-popover-trigger]");
    const panel = rootEl.querySelector("[data-airp-popover-panel]");
    const hoverTargets = [trigger, panel].filter(
      (el) => el instanceof HTMLElement
    );
    if (!hoverTargets.length) return;

    const timers = { open: null, close: null };
    hoverPopoverTimers.set(rootEl, timers);

    function isMovingWithinPopover(related) {
      if (!(related instanceof Node)) return false;
      return hoverTargets.some(
        (el) => el === related || el.contains(related)
      );
    }

    function scheduleOpen() {
      if (timers.close) {
        clearTimeout(timers.close);
        timers.close = null;
      }
      if (timers.open) return;
      timers.open = setTimeout(() => {
        timers.open = null;
        togglePopover(rootEl, true);
      }, HOVER_POPOVER_OPEN_DELAY_MS);
    }

    function scheduleClose() {
      if (timers.open) {
        clearTimeout(timers.open);
        timers.open = null;
      }
      if (timers.close) return;
      timers.close = setTimeout(() => {
        timers.close = null;
        togglePopover(rootEl, false);
      }, HOVER_POPOVER_CLOSE_DELAY_MS);
    }

    for (const el of hoverTargets) {
      el.addEventListener("pointerenter", scheduleOpen);
      el.addEventListener("pointerleave", (e) => {
        if (isMovingWithinPopover(e.relatedTarget)) return;
        scheduleClose();
      });
    }
  }

  applyThemePreset(preset);
  applyColorMode(colorMode);

  // Popovers: hover open/close — matches dashboard ToolbarHoverMenu.
  for (const r of popoverRoots()) {
    if (r.hasAttribute("data-airp-popover-hover")) {
      wireHoverPopover(r);
    }
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

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const actionEl = t.closest("[data-airp-file-tree-action]");
    if (!(actionEl instanceof HTMLElement)) return;

    const tree = actionEl.closest("[data-airp-file-tree]");
    if (!(tree instanceof HTMLElement)) return;

    const action = actionEl.getAttribute("data-airp-file-tree-action");
    if (action === "expand-all") {
      setAllFileTreeNodesOpen(tree, true);
      return;
    }
    if (action === "collapse-all") {
      setAllFileTreeNodesOpen(tree, false);
    }
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const trigger = t.closest("[data-airp-tab]");
    if (!(trigger instanceof HTMLElement)) return;

    const tabs = trigger.closest("[data-airp-tabs]");
    if (!(tabs instanceof HTMLElement)) return;

    const tabId = trigger.getAttribute("data-airp-tab");
    if (tabId == null) return;

    for (const btn of tabs.querySelectorAll("[data-airp-tab]")) {
      if (!(btn instanceof HTMLElement)) continue;
      const isActive = btn.getAttribute("data-airp-tab") === tabId;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    }
    for (const panel of tabs.querySelectorAll("[data-airp-tab-panel]")) {
      if (!(panel instanceof HTMLElement)) continue;
      panel.hidden = panel.getAttribute("data-airp-tab-panel") !== tabId;
    }
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
      updateChromeUi(activeUiLocale);
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
      updateChromeUi(activeUiLocale);
    });
  }

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const stored = readStorage(config.storageKeys.themeMode);
    if (stored === "system" || (!stored && config.exportColorMode === "system")) {
      applyColorMode("system");
    }
  });
})();
