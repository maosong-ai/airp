import { describe, expect, it } from "vitest";
import type { AirpDocument } from "@/lib/airp-schema";
import { createI18nContext } from "@/lib/i18n";
import { escapeInlineScript } from "@/lib/inline-script";
import { collectToc } from "@/lib/toc";
import { renderDocument } from "@/pipeline/render-document";
import { artifactFilename } from "@/pipeline/artifact-filename";
import type { RenderBackend } from "@/pipeline/types";

const doc: AirpDocument = {
  schemaVersion: "1.0.0",
  meta: {
    title: { en: "My Report", "zh-CN": "我的报告" },
    kind: "generic",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-CN"],
  },
  blocks: [
    {
      type: "section",
      title: "Overview",
      level: 2,
      children: [
        { type: "paragraph", text: "body" },
        {
          type: "appendix",
          title: "Details",
          children: [{ type: "paragraph", text: "detail" }],
        },
      ],
    },
  ],
};

describe("pipeline helpers", () => {
  it("collects TOC through section and appendix", () => {
    const ctx = createI18nContext(doc, "en");
    const toc = collectToc(doc.blocks, ctx);
    expect(toc.map((x) => x.title)).toEqual(["Overview", "Details"]);
  });

  it("creates a safe artifact filename", () => {
    expect(artifactFilename(doc, "en", "markdown")).toBe("my-report.md");
  });

  it("escapes closing script tags", () => {
    expect(escapeInlineScript("a</script>b")).toBe("a<\\/script>b");
  });

  it("throws when backend is not registered", async () => {
    await expect(renderDocument(doc, "html", { locale: "en" })).rejects.toThrow(
      "No render backend registered"
    );
  });

  it("renders when backend is registered", async () => {
    const backend: RenderBackend = {
      format: "markdown",
      async render() {
        return {
          format: "markdown",
          mimeType: "text/markdown",
          filename: "x.md",
          body: "ok",
        };
      },
    };

    const { registerBackend } = await import("@/pipeline/render-document");
    registerBackend(backend);
    const artifact = await renderDocument(doc, "markdown", { locale: "en" });
    expect(artifact.body).toBe("ok");
  });
});
