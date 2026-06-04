import { describe, expect, it } from "vitest";
import {
  resolveLocales,
  resolveRendererUiLocaleForSsr,
} from "@/lib/locale-resolution";

const rendererLocales = ["ja-JP", "zh-CN", "en", "fr-FR"] as const;

describe("locale resolution", () => {
  it("uses ui storage first for dashboard empty state", () => {
    const resolved = resolveLocales({
      mode: "dashboard-empty",
      rendererLocales,
      rendererDefaultLocale: "en",
      storedUiLocale: "zh-CN",
      browserLocales: ["fr-FR"],
    });

    expect(resolved.availableLocales).toEqual(rendererLocales);
    expect(resolved.uiLocale).toBe("zh-CN");
    expect(resolved.contentLocale).toBe("zh-CN");
    expect(resolved.shouldPersistUiLocale).toBe(true);
  });

  it("respects user-selected locale in dashboard empty state", () => {
    const resolved = resolveLocales({
      mode: "dashboard-empty",
      rendererLocales,
      rendererDefaultLocale: "en",
      storedUiLocale: "zh-CN",
      browserLocales: ["fr-FR"],
      preferredLocale: "fr-FR",
    });

    expect(resolved.uiLocale).toBe("fr-FR");
    expect(resolved.contentLocale).toBe("fr-FR");
  });

  it("uses content locale as ui locale when renderer supports the resolved content", () => {
    const resolved = resolveLocales({
      mode: "dashboard-doc",
      rendererLocales,
      rendererDefaultLocale: "en",
      storedUiLocale: "en",
      browserLocales: ["ja-JP"],
      docLocales: ["zh-CN", "de-DE"],
      docDefaultLocale: "zh-CN",
    });

    expect(resolved.availableLocales).toEqual(["zh-CN", "de-DE"]);
    expect(resolved.contentLocale).toBe("zh-CN");
    expect(resolved.uiLocale).toBe("zh-CN");
    expect(resolved.shouldPersistUiLocale).toBe(true);
  });

  it("treats a user-selected doc locale as preferred content intent in all mode", () => {
    const resolved = resolveLocales({
      mode: "html-all",
      rendererLocales,
      rendererDefaultLocale: "en",
      storedUiLocale: "en",
      browserLocales: ["ja-JP"],
      docLocales: ["zh-CN", "de-DE"],
      docDefaultLocale: "zh-CN",
      preferredLocale: "de-DE",
    });

    expect(resolved.contentLocale).toBe("de-DE");
    expect(resolved.uiLocale).toBe("en");
  });

  it("ignores storage in single mode and falls back from single locale to browser locale", () => {
    const resolved = resolveLocales({
      mode: "html-single",
      rendererLocales,
      rendererDefaultLocale: "en",
      storedUiLocale: "zh-CN",
      browserLocales: ["fr-FR"],
      singleLocale: "de-DE",
    });

    expect(resolved.availableLocales).toEqual(["de-DE"]);
    expect(resolved.contentLocale).toBe("de-DE");
    expect(resolved.uiLocale).toBe("fr-FR");
    expect(resolved.shouldPersistUiLocale).toBe(false);
  });

  it("uses single locale for ui when renderer supports it", () => {
    const resolved = resolveLocales({
      mode: "html-single",
      rendererLocales,
      rendererDefaultLocale: "en",
      browserLocales: ["fr-FR"],
      singleLocale: "zh-CN",
    });

    expect(resolved.uiLocale).toBe("zh-CN");
  });

  it("falls back to renderer default for SSR ui locale", () => {
    expect(
      resolveRendererUiLocaleForSsr("de-DE", rendererLocales, "en")
    ).toBe("en");
    expect(
      resolveRendererUiLocaleForSsr("zh-CN", rendererLocales, "en")
    ).toBe("zh-CN");
  });
});