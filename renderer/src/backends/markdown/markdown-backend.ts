import { artifactFilename } from "@/pipeline/artifact-filename";
import type { RenderBackend } from "@/pipeline/types";
import { emitDocument } from "./emit-document";

export const markdownBackend: RenderBackend = {
  format: "markdown",
  async render(doc, ctx) {
    if (!doc.i18n.locales.includes(ctx.locale)) {
      throw new Error(
        `locale "${ctx.locale}" not in document locales: ${doc.i18n.locales.join(", ")}`
      );
    }
    const body = emitDocument(doc, ctx.locale);
    return {
      format: "markdown",
      mimeType: "text/markdown",
      filename: artifactFilename(doc, ctx.locale, "markdown"),
      body,
    };
  },
};
