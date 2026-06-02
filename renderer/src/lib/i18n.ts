import type {
  AirpDocument,
  I18nConfig,
  LocalizedString,
  RichText,
} from "@/lib/airp-schema";

export function normalizeLocale(code: string): string {
  const parts = code.trim().split(/[-_]/);
  if (parts.length === 1) {
    return parts[0]!.toLowerCase();
  }
  return `${parts[0]!.toLowerCase()}-${parts[1]!.toUpperCase()}`;
}

export function detectSystemLocale(): string {
  if (typeof navigator === "undefined") {
    return "en";
  }
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of langs) {
    if (lang) {
      return normalizeLocale(lang);
    }
  }
  return "en";
}

export function pickLocale(
  doc: AirpDocument,
  preferred?: string | null
): string {
  const { locales, defaultLocale } = doc.i18n;
  const candidates = [
    preferred,
    detectSystemLocale(),
    defaultLocale,
    ...locales,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const norm = normalizeLocale(raw);
    const exact = locales.find((l) => normalizeLocale(l) === norm);
    if (exact) {
      return exact;
    }
    const langOnly = norm.split("-")[0]!;
    const partial = locales.find(
      (l) => normalizeLocale(l).split("-")[0] === langOnly
    );
    if (partial) {
      return partial;
    }
  }
  return defaultLocale;
}

export function resolveLocalized(
  value: LocalizedString | undefined,
  locale: string,
  doc: AirpDocument
): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  const keys = Object.keys(value);
  if (value[locale]) {
    return value[locale]!;
  }
  const def = doc.i18n.defaultLocale;
  if (value[def]) {
    return value[def]!;
  }
  for (const loc of doc.i18n.locales) {
    if (value[loc]) {
      return value[loc]!;
    }
  }
  const first = keys[0];
  return first ? (value[first] ?? "") : "";
}

export function resolveUi(
  doc: AirpDocument,
  locale: string,
  key: string,
  fallback: string
): string {
  const ui = doc.i18n.ui?.[locale]?.[key];
  if (ui) {
    return ui;
  }
  const def = doc.i18n.ui?.[doc.i18n.defaultLocale]?.[key];
  return def ?? fallback;
}

export type { RichText };

export function resolveRichText(
  value: RichText | undefined,
  locale: string,
  doc: AirpDocument
): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (!Array.isArray(value)) {
    return resolveLocalized(value, locale, doc);
  }
  return value
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "code":
          return `\`${node.value}\``;
        case "strong":
          return `**${node.children.map((c: import("@/lib/airp-schema").InlineNode) => (c.type === "text" ? c.value : "")).join("")}**`;
        case "link":
          return `[${node.children.map((c: import("@/lib/airp-schema").InlineNode) => (c.type === "text" ? c.value : "")).join("")}](${node.href})`;
        default:
          return "";
      }
    })
    .join("");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export type I18nContext = {
  locale: string;
  doc: AirpDocument;
  t: (value: LocalizedString | undefined) => string;
  tr: (value: RichText | undefined) => string;
  ui: (key: string, fallback: string) => string;
};

export function createI18nContext(
  doc: AirpDocument,
  locale: string
): I18nContext {
  return {
    locale,
    doc,
    t: (v) => resolveLocalized(v, locale, doc),
    tr: (v) => resolveRichText(v, locale, doc),
    ui: (key, fb) => resolveUi(doc, locale, key, fb),
  };
}

export type { I18nConfig };
