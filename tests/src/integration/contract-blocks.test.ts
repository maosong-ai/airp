import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { htmlBackendNode } from "../../../renderer/src/backends/html/html-backend.node.ts";
import { markdownBackend } from "../../../renderer/src/backends/markdown/markdown-backend.ts";
import type { AirpDocument, Block } from "../../../renderer/src/lib/airp-schema.ts";
import {
  registerBackend,
  renderDocument,
} from "../../../renderer/src/pipeline/render-document.ts";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const rendererRoot = path.join(repoRoot, "renderer");

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
  // ── Layout / structural ──────────────────────────────────────────────────
  hero: {
    type: "hero",
    metrics: [{ title: "A", value: 1, description: "d" }],
  },
  section: {
    type: "section",
    title: "S",
    children: [{ type: "paragraph", text: "p" }],
  },
  group: {
    type: "group",
    title: "G",
    children: [{ type: "paragraph", text: "p" }],
  },
  divider: { type: "divider" },
  spacer: { type: "spacer", size: "md" },
  collapsible: {
    type: "collapsible",
    summary: "More details",
    children: [{ type: "paragraph", text: "detail" }],
  },
  tabs: {
    type: "tabs",
    panels: [
      { label: "Tab A", children: [{ type: "paragraph", text: "a" }] },
      { label: "Tab B", children: [{ type: "paragraph", text: "b" }] },
    ],
  },
  appendix: {
    type: "appendix",
    title: "Appendix",
    children: [{ type: "paragraph", text: "extra" }],
  },
  // ── Text / prose ─────────────────────────────────────────────────────────
  heading: { type: "heading", level: 2, text: "Heading" },
  paragraph: { type: "paragraph", text: "Paragraph text." },
  lead: { type: "lead", text: "Lead paragraph." },
  pullQuote: { type: "pullQuote", text: "Key insight.", attribution: "Author" },
  blockquote: { type: "blockquote", text: "Quoted text." },
  callout: { type: "callout", variant: "info", title: "Note", body: "Body text." },
  // ── Lists ─────────────────────────────────────────────────────────────────
  bulletList: { type: "bulletList", items: ["Alpha", "Beta"] },
  numberedList: { type: "numberedList", items: ["First", "Second"] },
  checklist: {
    type: "checklist",
    items: [{ label: "t", checked: true }],
  },
  definitionList: {
    type: "definitionList",
    items: [{ term: "Term", definition: "Definition text" }],
  },
  keyValueList: {
    type: "keyValueList",
    items: [{ key: "Key", value: "Value" }],
  },
  // ── Data / tables ─────────────────────────────────────────────────────────
  table: {
    type: "table",
    columns: [{ key: "a", label: "A" }],
    rows: [{ a: "1" }],
  },
  statusBoard: {
    type: "statusBoard",
    items: [{ label: "Service", status: "done", detail: "All good" }],
  },
  collection: {
    type: "collection",
    variant: "card",
    items: [{ title: "Item", value: 1, description: "desc" }],
  },
  comparison: {
    type: "comparison",
    labelBefore: "Before",
    labelAfter: "After",
    before: [{ type: "bulletList", items: ["a"] }],
    after: [{ type: "bulletList", items: ["b", "c"] }],
  },
  // ── Code / files ──────────────────────────────────────────────────────────
  code: { type: "code", code: "x=1", language: "js" },
  codeDiff: { type: "codeDiff", language: "ts", before: "const x=1", after: "const x=2" },
  fileTree: {
    type: "fileTree",
    root: { name: "src", children: [{ name: "index.ts" }] },
  },
  fileChangeList: {
    type: "fileChangeList",
    items: [{ path: "src/index.ts", change: "modified" }],
  },
  // ── Diagrams ──────────────────────────────────────────────────────────────
  mermaid: { type: "mermaid", source: "flowchart LR\n  A-->B" },
  architectureOverview: {
    type: "architectureOverview",
    overview: { type: "mermaid", source: "flowchart LR\n  A-->B" },
    modules: [{ title: "API", description: "Gateway" }],
  },
  // ── Process / decision ────────────────────────────────────────────────────
  flowSteps: {
    type: "flowSteps",
    steps: [{ title: "Step 1", description: "detail", status: "done" }],
  },
  decision: {
    type: "decision",
    title: "D",
    status: "accepted",
    chosen: "yes",
  },
  timeline: {
    type: "timeline",
    events: [{ date: "2026-01", title: "Launch", status: "done" }],
  },
  roadmap: {
    type: "roadmap",
    phases: [{ title: "Phase 1", timeframe: "Q1", status: "done" }],
  },
  // ── Risk / quality ────────────────────────────────────────────────────────
  risk: {
    type: "risk",
    title: "R",
    severity: "high",
  },
  assumption: { type: "assumption", statement: "System is available.", validated: true },
  constraint: { type: "constraint", rule: "Must use Node 20.", scope: "Runtime" },
  openQuestion: { type: "openQuestion", question: "Which DB to use?", blocking: false },
  requirementTrace: {
    type: "requirementTrace",
    items: [{ reqId: "REQ-01", summary: "Login", status: "done" }],
  },
  testResult: {
    type: "testResult",
    suites: [{ name: "Unit", passed: 10, failed: 0, skipped: 1 }],
  },
  // ── API / links / refs ────────────────────────────────────────────────────
  apiInventory: {
    type: "apiInventory",
    endpoints: [{ method: "GET", path: "/health", summary: "Health check", status: "done" }],
  },
  linkList: {
    type: "linkList",
    links: [{ href: "https://example.com", label: "Example", description: "A link" }],
  },
  glossary: {
    type: "glossary",
    terms: [{ term: "API", definition: "Application Programming Interface" }],
  },
  citation: {
    type: "citation",
    items: [{ id: "ref-1", source: "RFC 9110", locator: "§5" }],
  },
  // ── Media ─────────────────────────────────────────────────────────────────
  image: { type: "image", src: "/x.png", alt: "alt" },
  embed: { type: "embed", url: "https://example.com" },
  // ── Meta ──────────────────────────────────────────────────────────────────
  agentNote: { type: "agentNote", text: "note", visible: true },
};

describe("contract blocks rendering", () => {
  it("renders each fixture block to markdown and html", async () => {
    registerBackend(markdownBackend);
    const hasDist = existsSync(path.join(rendererRoot, "dist"));
    if (hasDist) {
      registerBackend(htmlBackendNode);
    }

    for (const [name, block] of Object.entries(FIXTURES)) {
      const doc = { ...baseDoc(), blocks: [block] };

      const md = await renderDocument(doc, "markdown", { locale: "en" });
      expect(md.body, `markdown/${name}`).toContain("# Contract");

      if (hasDist) {
        const html = await renderDocument(doc, "html", {
          locale: "en",
          rendererRoot,
          localeMode: "single",
        });
        expect(html.body, `html/${name}`).toContain("<html");
      }
    }
  });
});