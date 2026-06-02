import { z } from "zod";

export const localizedStringSchema = z.union([
  z.string().min(1),
  z.record(z.string(), z.string().min(1)),
]);

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export const inlineNodeSchema: z.ZodType<InlineNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({ type: z.literal("code"), value: z.string() }),
    z.object({
      type: z.literal("strong"),
      children: z.array(inlineNodeSchema),
    }),
    z.object({
      type: z.literal("link"),
      href: z.string(),
      children: z.array(inlineNodeSchema),
    }),
  ])
);

export const richTextSchema = z.union([
  z.string(),
  z.array(inlineNodeSchema).min(1),
  localizedStringSchema,
]);

const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
const statusSchema = z.enum([
  "pass",
  "fail",
  "partial",
  "warning",
  "neutral",
  "pending",
  "in_progress",
  "done",
  "blocked",
  "skipped",
]);
const toneSchema = z.enum([
  "neutral",
  "positive",
  "negative",
  "warning",
  "accent",
]);
const importanceSchema = z.enum([
  "hero",
  "primary",
  "secondary",
  "reference",
]);

const badgeSchema = z.object({
  label: localizedStringSchema,
  tone: toneSchema.optional(),
  status: statusSchema.optional(),
});

type FileTreeNode = {
  name: string;
  change?: "added" | "modified" | "deleted" | "renamed" | "unchanged";
  annotation?: z.infer<typeof localizedStringSchema>;
  children?: FileTreeNode[];
};

const fileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    change: z
      .enum(["added", "modified", "deleted", "renamed", "unchanged"])
      .optional(),
    annotation: localizedStringSchema.optional(),
    children: z.array(fileTreeNodeSchema).optional(),
  })
);

export const blockSchema: z.ZodType<unknown> = z.lazy(() => {
  const collectionItemSchema: z.ZodObject<z.ZodRawShape> = z.object({
    title: localizedStringSchema.optional(),
    description: richTextSchema.optional(),
    value: z.union([z.string(), z.number()]).optional(),
    unit: localizedStringSchema.optional(),
    delta: localizedStringSchema.optional(),
    tone: toneSchema.optional(),
    status: statusSchema.optional(),
    badges: z.array(badgeSchema).optional(),
    meta: z.record(z.string(), z.string()).optional(),
    children: z.array(blockSchema).optional(),
  });

  return z.discriminatedUnion("type", [
    z.object({
      type: z.literal("hero"),
      id: z.string().optional(),
      importance: importanceSchema.optional(),
      metrics: z.array(collectionItemSchema).min(1).max(8),
      badges: z.array(badgeSchema).optional(),
    }),
    z.object({
      type: z.literal("section"),
      id: z.string().optional(),
      importance: importanceSchema.optional(),
      level: z.number().int().min(1).max(4).optional(),
      title: localizedStringSchema,
      lead: richTextSchema.optional(),
      children: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("group"),
      id: z.string().optional(),
      importance: importanceSchema.optional(),
      title: localizedStringSchema.optional(),
      children: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("divider"),
      label: localizedStringSchema.optional(),
    }),
    z.object({
      type: z.literal("spacer"),
      size: z.enum(["sm", "md", "lg"]).optional(),
    }),
    z.object({
      type: z.literal("heading"),
      id: z.string().optional(),
      importance: importanceSchema.optional(),
      level: z.number().int().min(1).max(6),
      text: localizedStringSchema,
    }),
    z.object({
      type: z.literal("paragraph"),
      text: richTextSchema,
    }),
    z.object({ type: z.literal("lead"), text: richTextSchema }),
    z.object({
      type: z.literal("pullQuote"),
      text: localizedStringSchema,
      attribution: localizedStringSchema.optional(),
    }),
    z.object({ type: z.literal("blockquote"), text: richTextSchema }),
    z.object({
      type: z.literal("callout"),
      variant: z
        .enum(["info", "tip", "success", "warning", "danger"])
        .optional(),
      title: localizedStringSchema.optional(),
      body: richTextSchema,
    }),
    z.object({
      type: z.literal("bulletList"),
      items: z.array(richTextSchema).min(1),
    }),
    z.object({
      type: z.literal("numberedList"),
      items: z.array(richTextSchema).min(1),
    }),
    z.object({
      type: z.literal("checklist"),
      items: z
        .array(
          z.object({
            label: richTextSchema,
            checked: z.boolean().optional(),
            status: statusSchema.optional(),
            note: richTextSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("definitionList"),
      items: z
        .array(
          z.object({
            term: localizedStringSchema,
            definition: richTextSchema,
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("table"),
      caption: localizedStringSchema.optional(),
      columns: z
        .array(
          z.object({
            key: z.string(),
            label: localizedStringSchema,
            cellKind: z
              .enum(["text", "code", "number", "status", "badge", "link"])
              .optional(),
            align: z.enum(["start", "end", "center"]).optional(),
          })
        )
        .min(1),
      rows: z.array(z.record(z.string(), z.unknown())),
      footerRow: z.record(z.string(), z.unknown()).optional(),
      importance: importanceSchema.optional(),
    }),
    z.object({
      type: z.literal("comparison"),
      labelBefore: localizedStringSchema.optional(),
      labelAfter: localizedStringSchema.optional(),
      before: z.array(blockSchema),
      after: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("collection"),
      variant: z.enum(["card", "metric", "stat", "chip", "panel", "compact"]),
      title: localizedStringSchema.optional(),
      items: z.array(collectionItemSchema).min(1),
      importance: importanceSchema.optional(),
    }),
    z.object({
      type: z.literal("keyValueList"),
      items: z
        .array(
          z.object({
            key: localizedStringSchema,
            value: richTextSchema,
          })
        )
        .min(1),
      layout: z.enum(["auto", "stacked", "inline"]).optional(),
    }),
    z.object({
      type: z.literal("statusBoard"),
      items: z
        .array(
          z.object({
            label: localizedStringSchema,
            status: statusSchema,
            detail: richTextSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("code"),
      language: z.string().optional(),
      filename: z.string().optional(),
      code: z.string(),
      highlightLines: z.array(z.number().int().positive()).optional(),
      maxLines: z.number().int().positive().optional(),
    }),
    z.object({
      type: z.literal("codeDiff"),
      filename: z.string().optional(),
      language: z.string().optional(),
      unified: z.string().optional(),
      before: z.string().optional(),
      after: z.string().optional(),
    }),
    z.object({
      type: z.literal("fileTree"),
      root: fileTreeNodeSchema,
      caption: localizedStringSchema.optional(),
    }),
    z.object({
      type: z.literal("fileChangeList"),
      items: z
        .array(
          z.object({
            path: z.string(),
            change: z.enum(["added", "modified", "deleted", "renamed"]),
            note: richTextSchema.optional(),
            sizeBefore: z.string().optional(),
            sizeAfter: z.string().optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("mermaid"),
      diagramKind: z
        .enum([
          "flowchart",
          "sequence",
          "class",
          "state",
          "er",
          "mindmap",
          "gantt",
          "other",
        ])
        .optional(),
      title: localizedStringSchema.optional(),
      source: z.string(),
      complexity: z.enum(["simple", "medium", "complex"]).optional(),
    }),
    z.object({
      type: z.literal("architectureOverview"),
      overview: z
        .object({
          type: z.literal("mermaid"),
          source: z.string(),
          complexity: z.enum(["simple", "medium", "complex"]).optional(),
        })
        .optional(),
      modules: z.array(collectionItemSchema).optional(),
    }),
    z.object({
      type: z.literal("flowSteps"),
      steps: z
        .array(
          z.object({
            title: localizedStringSchema,
            description: richTextSchema.optional(),
            status: statusSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("decision"),
      id: z.string().optional(),
      title: localizedStringSchema,
      context: richTextSchema.optional(),
      options: z
        .array(
          z.object({
            label: localizedStringSchema,
            pros: richTextSchema.optional(),
            cons: richTextSchema.optional(),
          })
        )
        .optional(),
      chosen: localizedStringSchema.optional(),
      rationale: richTextSchema.optional(),
      status: z.enum([
        "proposed",
        "accepted",
        "rejected",
        "superseded",
        "deferred",
      ]),
    }),
    z.object({
      type: z.literal("risk"),
      id: z.string().optional(),
      title: localizedStringSchema,
      description: richTextSchema.optional(),
      severity: severitySchema,
      likelihood: z
        .enum(["rare", "unlikely", "possible", "likely", "certain"])
        .optional(),
      mitigation: richTextSchema.optional(),
      owner: z.string().optional(),
      status: z.enum(["open", "mitigated", "accepted", "closed"]).optional(),
    }),
    z.object({
      type: z.literal("assumption"),
      statement: richTextSchema,
      validated: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("constraint"),
      rule: richTextSchema,
      scope: localizedStringSchema.optional(),
      nonNegotiable: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("openQuestion"),
      question: richTextSchema,
      blocking: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("timeline"),
      events: z
        .array(
          z.object({
            date: z.string().optional(),
            title: localizedStringSchema,
            description: richTextSchema.optional(),
            status: statusSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("roadmap"),
      phases: z
        .array(
          z.object({
            title: localizedStringSchema,
            timeframe: localizedStringSchema.optional(),
            goals: z.array(richTextSchema).optional(),
            status: statusSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("requirementTrace"),
      items: z
        .array(
          z.object({
            reqId: z.string(),
            summary: localizedStringSchema.optional(),
            status: statusSchema,
            evidence: richTextSchema.optional(),
            gap: richTextSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("testResult"),
      suites: z
        .array(
          z.object({
            name: z.string(),
            passed: z.number().int().min(0),
            failed: z.number().int().min(0),
            skipped: z.number().int().min(0).optional(),
            notes: richTextSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("apiInventory"),
      endpoints: z
        .array(
          z.object({
            method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
            path: z.string(),
            summary: localizedStringSchema.optional(),
            status: statusSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("linkList"),
      title: localizedStringSchema.optional(),
      links: z
        .array(
          z.object({
            href: z.string(),
            label: localizedStringSchema,
            description: richTextSchema.optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("glossary"),
      terms: z
        .array(
          z.object({
            term: localizedStringSchema,
            definition: richTextSchema,
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("citation"),
      items: z
        .array(
          z.object({
            id: z.string(),
            source: z.string(),
            locator: z.string().optional(),
          })
        )
        .min(1),
    }),
    z.object({
      type: z.literal("image"),
      src: z.string(),
      alt: localizedStringSchema,
      caption: localizedStringSchema.optional(),
    }),
    z.object({
      type: z.literal("embed"),
      url: z.string(),
      title: localizedStringSchema.optional(),
    }),
    z.object({
      type: z.literal("collapsible"),
      summary: localizedStringSchema,
      defaultOpen: z.boolean().optional(),
      importance: importanceSchema.optional(),
      children: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("tabs"),
      panels: z
        .array(
          z.object({
            label: localizedStringSchema,
            children: z.array(blockSchema),
          })
        )
        .min(2),
    }),
    z.object({
      type: z.literal("appendix"),
      title: localizedStringSchema,
      children: z.array(blockSchema),
    }),
    z.object({
      type: z.literal("agentNote"),
      text: richTextSchema,
      visible: z.boolean().optional(),
    }),
  ]);
});

export const documentMetaSchema = z.object({
  title: localizedStringSchema,
  subtitle: localizedStringSchema.optional(),
  kind: z.enum([
    "refactoring",
    "migration",
    "audit",
    "plan-review",
    "diff-review",
    "architecture",
    "incident",
    "recap",
    "fact-check",
    "generic",
  ]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  authors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sourceRefs: z
    .array(
      z.object({
        type: z.enum(["path", "url", "commit", "pr", "issue"]),
        value: z.string(),
        label: localizedStringSchema.optional(),
      })
    )
    .optional(),
});

export const i18nConfigSchema = z.object({
  defaultLocale: z.string(),
  locales: z.array(z.string()).min(1),
  ui: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export const airpDocumentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  meta: documentMetaSchema,
  i18n: i18nConfigSchema,
  blocks: z.array(blockSchema).min(1),
});

/** Parsed AIRP block node (discriminated by `type`). Typed loosely due to recursive Zod lazy schema. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Block = any;
export type LocalizedString = z.infer<typeof localizedStringSchema>;
export type RichText = z.infer<typeof richTextSchema>;
export type AirpDocument = z.infer<typeof airpDocumentSchema>;
export type I18nConfig = z.infer<typeof i18nConfigSchema>;

export function parseAirpDocument(json: unknown): AirpDocument {
  return airpDocumentSchema.parse(json);
}
