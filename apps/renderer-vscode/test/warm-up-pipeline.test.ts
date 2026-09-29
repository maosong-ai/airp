import { describe, expect, it } from "vitest";
import {
  WARM_UP_DOCUMENT,
  warmUpPipeline,
} from "../src/workers/warm-up-pipeline";

/** Keep in sync with `BLOCK_HANDLERS` in renderer-target-html. */
const HTML_EMIT_BLOCK_TYPES = [
  "agentNote",
  "apiInventory",
  "appendix",
  "architectureOverview",
  "assumption",
  "blockquote",
  "bulletList",
  "callout",
  "checklist",
  "citation",
  "code",
  "codeDiff",
  "collapsible",
  "collection",
  "comparison",
  "constraint",
  "decision",
  "definitionList",
  "divider",
  "embed",
  "fileChangeList",
  "fileTree",
  "flowSteps",
  "glossary",
  "group",
  "heading",
  "hero",
  "image",
  "keyValueList",
  "lead",
  "linkList",
  "mermaid",
  "numberedList",
  "openQuestion",
  "paragraph",
  "pullQuote",
  "requirementTrace",
  "risk",
  "roadmap",
  "section",
  "spacer",
  "statusBoard",
  "table",
  "tabs",
  "testResult",
  "timeline",
] as const;

function collectBlockTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectBlockTypes(item, out);
    }
    return;
  }
  if (node === null || typeof node !== "object") {
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.type === "string") {
    out.add(record.type);
  }
  for (const value of Object.values(record)) {
    collectBlockTypes(value, out);
  }
}

describe("warmUpPipeline", () => {
  it("covers every HTML emit block type", () => {
    const types = new Set<string>();
    collectBlockTypes(WARM_UP_DOCUMENT.blocks, types);
    expect([...HTML_EMIT_BLOCK_TYPES].sort()).toEqual([...types].sort());
  });

  it("validates and HTML-renders the in-memory warm-up document", async () => {
    expect(WARM_UP_DOCUMENT.schemaVersion).toBe("1.1.0");
    await expect(warmUpPipeline()).resolves.toBeUndefined();
  });
});
