import type { AirpDocument } from "@/lib/airp-schema";
import { resolveLocalized } from "@/lib/i18n";
import { emitBlocks } from "./emit-block";

export function emitDocument(doc: AirpDocument, locale: string): string {
  const title = resolveLocalized(doc.meta.title, locale, doc);
  const subtitle = doc.meta.subtitle
    ? resolveLocalized(doc.meta.subtitle, locale, doc)
    : "";

  let out = `# ${title}\n\n`;
  if (subtitle) {
    out += `${subtitle}\n\n`;
  }

  const meta: string[] = [];
  if (doc.meta.kind) {
    meta.push(`**Kind:** ${doc.meta.kind}`);
  }
  if (doc.meta.authors?.length) {
    meta.push(`**Authors:** ${doc.meta.authors.join(", ")}`);
  }
  if (doc.meta.tags?.length) {
    meta.push(`**Tags:** ${doc.meta.tags.join(", ")}`);
  }
  if (meta.length) {
    out += `${meta.join(" · ")}\n\n`;
  }

  out += "---\n\n";
  out += emitBlocks(doc.blocks, doc, locale);
  return out.trimEnd() + "\n";
}
