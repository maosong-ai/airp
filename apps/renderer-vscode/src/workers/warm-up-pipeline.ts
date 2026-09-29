import type { AirpDocumentSnapshot } from "@airp/renderer";
import { renderDocument } from "@airp/renderer/node/render";
import { validateDocument } from "@airp/validate";

/**
 * In-memory 1.1.0 document that exercises every HTML emit handler once.
 * Not a fixture; bundled into the worker so vsix installs do not read disk.
 */
export const WARM_UP_DOCUMENT: AirpDocumentSnapshot = {
  schemaVersion: "1.1.0",
  meta: {
    title: "Worker pipeline warm-up",
    kind: "generic",
    createdAt: "2026-09-29T00:00:00.000Z",
    createdBy: "AIRP",
  },
  i18n: { locale: "en" },
  blocks: [
    {
      type: "hero",
      "@id": "w000000001",
      metrics: [
        {
          "@id": "w000000002",
          title: "Ready",
          value: 1,
          tone: "positive",
        },
      ],
    },
    {
      type: "lead",
      "@id": "w000000003",
      text: "Warm-up **lead** with `code`.",
    },
    {
      type: "section",
      "@id": "w000000004",
      level: 1,
      title: "Pipeline",
      children: [
        {
          type: "paragraph",
          "@id": "w000000005",
          text: "Paragraph with **bold**.",
        },
        {
          type: "callout",
          "@id": "w000000006",
          variant: "tip",
          title: "Tip",
          body: "Callout body.",
        },
        {
          type: "code",
          "@id": "w000000007",
          language: "typescript",
          filename: "warm.ts",
          code: "export const ready = true;\n",
        },
        {
          type: "codeDiff",
          "@id": "w000000008",
          filename: "warm.ts",
          language: "typescript",
          before: "export const ready = false;\n",
          after: "export const ready = true;\n",
        },
        {
          type: "mermaid",
          "@id": "w000000009",
          diagramKind: "flowchart",
          source: "flowchart LR\n  A-->B",
        },
        {
          type: "table",
          "@id": "w000000010",
          columns: [
            { "@id": "w000000011", key: "name", label: "Name" },
            { "@id": "w000000012", key: "value", label: "Value" },
          ],
          rows: [{ "@id": "w000000013", name: "alpha", value: "1" }],
        },
        {
          type: "tabs",
          "@id": "w000000014",
          panels: [
            {
              "@id": "w000000015",
              label: "One",
              children: [
                {
                  type: "paragraph",
                  "@id": "w000000016",
                  text: "First panel.",
                },
              ],
            },
            {
              "@id": "w000000017",
              label: "Two",
              children: [
                {
                  type: "paragraph",
                  "@id": "w000000018",
                  text: "Second panel.",
                },
              ],
            },
          ],
        },
        {
          type: "collapsible",
          "@id": "w000000019",
          summary: "Notes",
          children: [
            {
              type: "paragraph",
              "@id": "w000000020",
              text: "Inside.",
            },
          ],
        },
        {
          type: "bulletList",
          "@id": "w000000021",
          items: ["Alpha"],
        },
        {
          type: "numberedList",
          "@id": "w000000022",
          items: ["First"],
        },
        {
          type: "checklist",
          "@id": "w000000023",
          items: [{ "@id": "w000000024", label: "Done", checked: true }],
        },
        {
          type: "constraint",
          "@id": "w000000025",
          rule: "Warm-up stays in memory.",
          scope: "worker",
        },
        {
          type: "fileChangeList",
          "@id": "w000000026",
          items: [
            {
              "@id": "w000000027",
              path: "src/warm-up-pipeline.ts",
              change: "added",
            },
          ],
        },
        {
          type: "roadmap",
          "@id": "w000000028",
          phases: [
            {
              "@id": "w000000029",
              title: "Warm",
              status: "done",
              goals: ["JIT the pipeline"],
            },
          ],
        },
        {
          type: "architectureOverview",
          "@id": "w000000030",
          overview: {
            type: "mermaid",
            "@id": "w000000031",
            source: "flowchart TB\n  API-->DB",
          },
          modules: [
            {
              "@id": "w000000032",
              title: "API",
              description: "Edge",
            },
          ],
        },
        { type: "divider", "@id": "w000000033", label: "Break" },
        { type: "spacer", "@id": "w000000034", size: "sm" },
        {
          type: "heading",
          "@id": "w000000035",
          level: 3,
          text: "Heading",
        },
        {
          type: "pullQuote",
          "@id": "w000000036",
          text: "Quoted.",
          attribution: "AIRP",
        },
        {
          type: "blockquote",
          "@id": "w000000037",
          text: "Quoted **body**.",
        },
        {
          type: "definitionList",
          "@id": "w000000038",
          items: [
            {
              "@id": "w000000039",
              term: "AIRP",
              definition: "Agent report protocol.",
            },
          ],
        },
        {
          type: "comparison",
          "@id": "w000000040",
          labelBefore: "Before",
          labelAfter: "After",
          before: [
            {
              type: "paragraph",
              "@id": "w000000041",
              text: "Old.",
            },
          ],
          after: [
            {
              type: "paragraph",
              "@id": "w000000042",
              text: "New.",
            },
          ],
        },
        {
          type: "collection",
          "@id": "w000000043",
          variant: "card",
          items: [{ "@id": "w000000044", title: "Card", description: "Item." }],
        },
        {
          type: "keyValueList",
          "@id": "w000000045",
          items: [{ "@id": "w000000046", key: "Env", value: "test" }],
        },
        {
          type: "statusBoard",
          "@id": "w000000047",
          items: [
            {
              "@id": "w000000048",
              label: "Build",
              status: "pass",
            },
          ],
        },
        {
          type: "fileTree",
          "@id": "w000000049",
          root: { "@id": "w000000050", name: "src", change: "unchanged" },
        },
        {
          type: "flowSteps",
          "@id": "w000000051",
          steps: [{ "@id": "w000000052", title: "Start", status: "done" }],
        },
        {
          type: "decision",
          "@id": "w000000053",
          title: "Choice",
          status: "accepted",
          options: [{ "@id": "w000000054", label: "A" }],
        },
        {
          type: "risk",
          "@id": "w000000055",
          title: "Risk",
          severity: "low",
        },
        {
          type: "assumption",
          "@id": "w000000056",
          statement: "Assumed.",
        },
        {
          type: "openQuestion",
          "@id": "w000000057",
          question: "Open?",
        },
        {
          type: "timeline",
          "@id": "w000000058",
          events: [{ "@id": "w000000059", title: "Shipped", status: "done" }],
        },
        {
          type: "requirementTrace",
          "@id": "w000000060",
          items: [
            {
              "@id": "w000000061",
              reqId: "R1",
              status: "pass",
              summary: "Covered",
            },
          ],
        },
        {
          type: "testResult",
          "@id": "w000000062",
          suites: [
            {
              "@id": "w000000063",
              name: "unit",
              passed: 1,
              failed: 0,
            },
          ],
        },
        {
          type: "apiInventory",
          "@id": "w000000064",
          endpoints: [
            {
              "@id": "w000000065",
              method: "GET",
              path: "/health",
              status: "pass",
            },
          ],
        },
        {
          type: "linkList",
          "@id": "w000000066",
          links: [
            {
              "@id": "w000000067",
              href: "https://example.com/",
              label: "Example",
            },
          ],
        },
        {
          type: "glossary",
          "@id": "w000000068",
          terms: [
            {
              "@id": "w000000069",
              term: "JIT",
              definition: "Just-in-time.",
            },
          ],
        },
        {
          type: "citation",
          "@id": "w000000070",
          items: [{ "@id": "w000000071", source: "AIRP" }],
        },
        {
          type: "image",
          "@id": "w000000072",
          src: "https://example.com/warm.png",
          alt: "Warm",
        },
        {
          type: "embed",
          "@id": "w000000073",
          url: "https://example.com/",
          title: "Embed",
        },
        {
          type: "group",
          "@id": "w000000074",
          title: "Group",
          children: [
            {
              type: "paragraph",
              "@id": "w000000075",
              text: "Grouped.",
            },
          ],
        },
        {
          type: "codeDiff",
          "@id": "w000000076",
          filename: "warm.ts",
          language: "diff",
          unified:
            "@@ -1 +1 @@\n-export const ready = false;\n+export const ready = true;\n",
        },
        {
          type: "agentNote",
          "@id": "w000000077",
          text: "Agent note.",
          visible: true,
        },
      ],
    },
    {
      type: "appendix",
      "@id": "w000000078",
      title: "Appendix",
      children: [
        {
          type: "paragraph",
          "@id": "w000000079",
          text: "Appendix body.",
        },
      ],
    },
  ],
};

/**
 * Validate and HTML-render the in-memory warm-up document so V8 JITs those
 * paths before the first user job. Rejects on failure; the caller decides.
 */
export async function warmUpPipeline(): Promise<void> {
  const validation = await validateDocument(WARM_UP_DOCUMENT);
  if (!validation.ok) {
    const message = validation.diagnostics[0]?.message ?? "validation failed";
    throw new Error(`Pipeline warm-up validation failed: ${message}`);
  }
  const rendered = await renderDocument(WARM_UP_DOCUMENT, "html", {});
  if (!rendered.ok) {
    const message = rendered.diagnostics[0]?.message ?? "render failed";
    throw new Error(`Pipeline warm-up render failed: ${message}`);
  }
}
