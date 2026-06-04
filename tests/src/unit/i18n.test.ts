import { describe, expect, it } from "vitest";
import type { AirpDocument, InlineNode } from "@/lib/airp-schema";
import {
  normalizeLocale,
  pickLocale,
  resolveLocalized,
  resolveRichText,
} from "@/lib/i18n";

const baseDoc: AirpDocument = {
  schemaVersion: "1.0.0",
  meta: {
    title: { en: "English", "zh-CN": "中文" },
    kind: "generic",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en", "ja"],
  },
  blocks: [{ type: "paragraph", text: "hello" }],
};

describe("i18n helpers", () => {
  it("normalizes locale with language and region", () => {
    expect(normalizeLocale("EN_us")).toBe("en-US");
    expect(normalizeLocale("zh-cn")).toBe("zh-CN");
  });

  it("picks preferred locale with language fallback", () => {
    expect(pickLocale(baseDoc, "en-US")).toBe("en");
    expect(["en", "zh-CN"]).toContain(pickLocale(baseDoc, "fr-FR"));
  });

  it("resolves localized string with default fallback", () => {
    const value = { en: "Hello", "zh-CN": "你好" };
    expect(resolveLocalized(value, "ja", baseDoc)).toBe("你好");
  });

  it("resolves rich text inline nodes to markdown-like plain output", () => {
    const rich: InlineNode[] = [
      { type: "text", value: "A" },
      { type: "code", value: "B" },
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", value: "C" }],
      },
    ];

    expect(resolveRichText(rich, "en", baseDoc)).toBe(
      "A`B`[C](https://example.com)"
    );
  });
});
