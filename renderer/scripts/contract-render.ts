#!/usr/bin/env npx tsx
/**
 * Contract test: each block type renders to HTML + Markdown without throwing.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlBackendNode } from "../src/backends/html/html-backend.node.ts";
import { markdownBackend } from "../src/backends/markdown/markdown-backend.ts";
import type { AirpDocument, Block } from "../src/lib/airp-schema.ts";
import {
  registerBackend,
  renderDocument,
} from "../src/pipeline/render-document.ts";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rendererRoot = path.resolve(moduleDir, "..");

const baseDoc = (): AirpDocument => ({
  schemaVersion: "1.0.0",
  meta: {
    title: "Contract",
    kind: "generic",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  i18n: { defaultLocale: "en", locales: ["en"] },
  blocks: [],
});

const FIXTURES: Record<string, Block> = {
  hero: {
    type: "hero",
    metrics: [{ title: "A", value: 1, description: "d" }],
  },
  section: {
    type: "section",
    title: "S",
    children: [{ type: "paragraph", text: "p" }],
  },
  lead: { type: "lead", text: "lead" },
  table: {
    type: "table",
    columns: [{ key: "a", label: "A" }],
    rows: [{ a: "1" }],
  },
  code: { type: "code", code: "x=1", language: "js" },
  mermaid: { type: "mermaid", source: "flowchart LR\n  A-->B" },
  checklist: {
    type: "checklist",
    items: [{ label: "t", checked: true }],
  },
  decision: {
    type: "decision",
    title: "D",
    status: "accepted",
    chosen: "yes",
  },
  risk: {
    type: "risk",
    title: "R",
    severity: "high",
  },
  agentNote: { type: "agentNote", text: "note", visible: true },
  image: { type: "image", src: "/x.png", alt: "alt" },
  embed: { type: "embed", url: "https://example.com" },
  definitionList: {
    type: "definitionList",
    items: [{ term: "Term", definition: "Definition text" }],
  },
  flowSteps: {
    type: "flowSteps",
    steps: [{ title: "1. First step", description: "detail", status: "done" }],
  },
  comparison: {
    type: "comparison",
    labelBefore: "Before",
    labelAfter: "After",
    before: [{ type: "bulletList", items: ["a"] }],
    after: [{ type: "bulletList", items: ["b", "c"] }],
  },
  tableLocalized: {
    type: "table",
    columns: [{ key: "role", label: "Role" }],
    rows: [
      {
        role: {
          en: "English role",
          "zh-CN": "中文职责",
        },
      },
    ],
  },
};

async function main() {
  if (!existsSync(path.join(rendererRoot, "dist"))) {
    console.warn("Skip HTML contract: run `pnpm build` first (no dist/).");
  }

  registerBackend(markdownBackend);
  if (existsSync(path.join(rendererRoot, "dist"))) {
    registerBackend(htmlBackendNode);
  }

  let failed = 0;

  for (const [name, block] of Object.entries(FIXTURES)) {
    const doc = { ...baseDoc(), blocks: [block] };

    try {
      const md = await renderDocument(doc, "markdown", { locale: "en" });
      if (!md.body.includes("# Contract")) {
        throw new Error("missing title in markdown output");
      }
    } catch (err) {
      console.error(`FAIL markdown/${name}:`, err);
      failed++;
    }

    if (existsSync(path.join(rendererRoot, "dist"))) {
      try {
        await renderDocument(doc, "html", {
          locale: "en",
          rendererRoot,
          localeMode: "single",
        });
      } catch (err) {
        console.error(`FAIL html/${name}:`, err);
        failed++;
      }
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} contract failure(s)`);
    process.exit(1);
  }
  console.log(`OK: ${Object.keys(FIXTURES).length} block types (md${existsSync(path.join(rendererRoot, "dist")) ? "+html" : ""})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
