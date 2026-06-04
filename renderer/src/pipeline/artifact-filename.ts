import type { AirpDocument } from "@/lib/airp-schema";
import { resolveLocalized } from "@/lib/i18n";
import type { RenderTarget } from "./types";

const EXT: Record<RenderTarget, string> = {
  html: "html",
  markdown: "md",
};

/** Derive a safe download filename from `meta.title`. */
export function artifactFilename(
  doc: AirpDocument,
  locale: string,
  format: RenderTarget
): string {
  const title = resolveLocalized(doc.meta.title, locale, doc) || "report";
  const safe =
    title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "report";
  return `${safe}.${EXT[format]}`;
}
