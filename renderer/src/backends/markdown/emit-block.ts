import type { AirpDocument, Block, LocalizedString } from "@/lib/airp-schema";
import { createI18nContext, type I18nContext } from "@/lib/i18n";
import { tRenderer } from "@/lib/renderer-i18n";

export type EmitContext = I18nContext & {
  headingLevel: number;
};

function loc(value: unknown): LocalizedString {
  return value as LocalizedString;
}

function mdHeading(level: number, text: string): string {
  const h = Math.min(Math.max(level, 1), 6);
  return `${"#".repeat(h)} ${text}\n\n`;
}

function fence(code: string, lang?: string): string {
  return `\`\`\`${lang ?? ""}\n${code}\n\`\`\`\n\n`;
}

function cellText(value: unknown, ctx: EmitContext): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return ctx.tr(value as never).replace(/\|/g, "\\|").replace(/\n/g, " ");
  }
  if (typeof value === "object" && value !== null && "label" in value) {
    return ctx.t((value as { label: unknown }).label as never);
  }
  if (typeof value === "object" && value !== null) {
    return ctx.t(value as LocalizedString).replace(/\|/g, "\\|").replace(/\n/g, " ");
  }
  return String(value);
}

function stripLeadingOrdinal(text: string): string {
  return text.replace(/^\d+\.\s*/, "");
}

/** Bullet-list rows when a side is exactly one bulletList block. */
function extractBulletListRows(
  blocks: Block[] | undefined,
  ctx: EmitContext
): string[] | null {
  if (!blocks || blocks.length !== 1 || blocks[0]?.type !== "bulletList") {
    return null;
  }
  return (blocks[0] as { items: unknown[] }).items.map((item) =>
    ctx.tr(item as never)
  );
}

function childHeadingCtx(ctx: EmitContext, parentLevel: number): EmitContext {
  return { ...ctx, headingLevel: Math.min(parentLevel + 1, 6) };
}

function gfmTable(headers: string[], rows: string[][]): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  const header = `| ${headers.map(esc).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(esc).join(" | ")} |`).join("\n");
  return `${header}\n${sep}\n${body}\n\n`;
}

function emitChildren(
  blocks: Block[],
  ctx: EmitContext,
  levelOffset = 0
): string {
  return blocks.map((b) => emitBlock(b, ctx, levelOffset)).join("");
}

export function emitBlock(
  block: Block,
  ctx: EmitContext,
  levelOffset = 0
): string {
  const { t, tr } = ctx;

  switch (block.type) {
    case "hero": {
      let out = "";
      for (const m of block.metrics ?? []) {
        const title = m.title ? t(m.title) : "";
        const val = m.value != null ? String(m.value) : "";
        const unit = m.unit ? t(m.unit) : "";
        const desc = m.description ? tr(m.description) : "";
        out += `- **${title}**: ${val}${unit ? ` ${unit}` : ""}${desc ? ` — ${desc}` : ""}\n`;
      }
      if (block.badges?.length) {
        out += block.badges
          .map((b: { label: unknown }) => `- _${t(loc(b.label))}_\n`)
          .join("");
      }
      return `${out}\n`;
    }

    case "section": {
      const level = (block.level ?? 2) + levelOffset;
      let out = mdHeading(level, t(block.title));
      if (block.lead) {
        out += `> ${tr(block.lead).replace(/\n/g, "\n> ")}\n\n`;
      }
      out += emitChildren(
        block.children ?? [],
        childHeadingCtx(ctx, level),
        0
      );
      return out;
    }

    case "group": {
      const hasTitle = Boolean(block.title);
      let out = hasTitle ? mdHeading(ctx.headingLevel, t(block.title)) : "";
      const childCtx = hasTitle
        ? childHeadingCtx(ctx, ctx.headingLevel)
        : ctx;
      out += emitChildren(block.children ?? [], childCtx, levelOffset);
      return out;
    }

    case "divider":
      return block.label ? `---\n\n_${t(block.label)}_\n\n` : "---\n\n";

    case "spacer":
      return "\n";

    case "heading":
      return mdHeading(block.level + levelOffset, t(block.text));

    case "paragraph":
      return `${tr(block.text)}\n\n`;

    case "lead":
      return `> ${tr(block.text).replace(/\n/g, "\n> ")}\n\n`;

    case "pullQuote": {
      let out = `> ${t(block.text)}\n`;
      if (block.attribution) {
        out += `>\n> — ${t(block.attribution)}\n`;
      }
      return `${out}\n`;
    }

    case "blockquote":
      return `> ${tr(block.text).replace(/\n/g, "\n> ")}\n\n`;

    case "callout": {
      const title = block.title ? `**${t(block.title)}**\n\n` : "";
      return `> ${title}${tr(block.body).replace(/\n/g, "\n> ")}\n\n`;
    }

    case "bulletList":
      return (
        block.items.map((item: unknown) => `- ${tr(item as never)}\n`).join("") +
        "\n"
      );

    case "numberedList":
      return (
        block.items
          .map((item: unknown, i: number) => `${i + 1}. ${tr(item as never)}\n`)
          .join("") + "\n"
      );

    case "checklist":
      return (
        block.items
          .map(
            (item: {
              label: unknown;
              checked?: boolean;
              note?: unknown;
            }) => {
              const box = item.checked ? "x" : " ";
              const note = item.note ? ` — ${tr(item.note as never)}` : "";
              return `- [${box}] ${tr(item.label as never)}${note}\n`;
            }
          )
          .join("") + "\n"
      );

    case "definitionList":
      return (
        block.items
          .map(
            (item: { term: unknown; definition: unknown }) =>
              `**${t(loc(item.term))}**:\n${tr(item.definition as never)}\n\n`
          )
          .join("") + "\n"
      );

    case "table": {
      const cols = block.columns ?? [];
      const headers = cols.map((c: { label: unknown }) => t(loc(c.label)));
      const rows = (block.rows ?? []).map((row: Record<string, unknown>) =>
        cols.map((c: { key: string }) => cellText(row[c.key], ctx))
      );
      let out = block.caption ? `_${t(block.caption)}_\n\n` : "";
      out += gfmTable(headers, rows);
      if (block.footerRow) {
        const footer = cols.map((c: { key: string }) =>
          cellText(block.footerRow[c.key], ctx)
        );
        out += gfmTable(headers, [footer]);
      }
      return out;
    }

    case "comparison": {
      const beforeLabel = block.labelBefore ? t(block.labelBefore) : "Before";
      const afterLabel = block.labelAfter ? t(block.labelAfter) : "After";
      const beforeRows = extractBulletListRows(block.before, ctx);
      const afterRows = extractBulletListRows(block.after, ctx);

      if (beforeRows && afterRows) {
        const rowCount = Math.max(beforeRows.length, afterRows.length);
        const rows: string[][] = [];
        for (let i = 0; i < rowCount; i++) {
          rows.push([beforeRows[i] ?? "", afterRows[i] ?? ""]);
        }
        return gfmTable([beforeLabel, afterLabel], rows);
      }

      let out = mdHeading(ctx.headingLevel, beforeLabel);
      out += emitChildren(block.before ?? [], ctx, levelOffset);
      out += mdHeading(ctx.headingLevel, afterLabel);
      out += emitChildren(block.after ?? [], ctx, levelOffset);
      return out;
    }

    case "collection": {
      let out = block.title ? mdHeading(ctx.headingLevel, t(block.title)) : "";
      for (const item of block.items ?? []) {
        const title = item.title ? t(item.title) : "";
        const val =
          item.value != null
            ? `${item.value}${item.unit ? ` ${t(item.unit)}` : ""}`
            : "";
        const desc = item.description ? tr(item.description) : "";
        out += `- **${title}**${val ? `: ${val}` : ""}${desc ? ` — ${desc}` : ""}\n`;
      }
      return `${out}\n`;
    }

    case "keyValueList":
      return gfmTable(
        ["Key", "Value"],
        block.items.map((item: { key: unknown; value: unknown }) => [
          t(loc(item.key)),
          tr(item.value as never),
        ])
      );

    case "statusBoard":
      return gfmTable(
        ["Item", "Status", "Detail"],
        block.items.map(
          (item: { label: unknown; status: string; detail?: unknown }) => [
            t(loc(item.label)),
            item.status,
            item.detail ? tr(item.detail as never) : "",
          ]
        )
      );

    case "code": {
      let out = block.filename ? `\`${block.filename}\`\n\n` : "";
      return out + fence(block.code, block.language);
    }

    case "codeDiff": {
      let out = block.filename ? `\`${block.filename}\`\n\n` : "";
      const lang = block.language ?? "diff";
      if (block.unified) {
        return out + fence(block.unified, lang);
      }
      const diff = [
        block.filename ? `--- a/${block.filename}` : "--- a/file",
        block.filename ? `+++ b/${block.filename}` : "+++ b/file",
        block.before ? `-${block.before.split("\n").join("\n-")}` : "",
        block.after ? `+${block.after.split("\n").join("\n+")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return out + fence(diff, lang);
    }

    case "fileTree": {
      const lines: string[] = [];
      function walk(
        node: {
          name: string;
          annotation?: unknown;
          children?: unknown[];
        },
        prefix: string
      ) {
        const note = node.annotation ? ` (${t(node.annotation as never)})` : "";
        lines.push(`${prefix}${node.name}${note}`);
        for (const child of node.children ?? []) {
          walk(child as typeof node, `${prefix}  `);
        }
      }
      walk(block.root, "");
      let out = mdHeading(
        ctx.headingLevel,
        ctx.ui(
          "fileTreeToolbarTitle",
          tRenderer(ctx.locale, "fileTreeToolbarTitle")
        )
      );
      if (block.caption) {
        out += `_${t(block.caption)}_\n\n`;
      }
      return out + fence(lines.join("\n"), "text");
    }

    case "fileChangeList":
      return gfmTable(
        ["Path", "Change", "Note"],
        block.items.map(
          (item: { path: string; change: string; note?: unknown }) => [
            item.path,
            item.change,
            item.note ? tr(item.note as never) : "",
          ]
        )
      );

    case "mermaid": {
      let out = block.title ? `${t(block.title)}\n\n` : "";
      out += fence(block.source, "mermaid");
      return out;
    }

    case "architectureOverview": {
      let out = "";
      if (block.overview?.source) {
        out += fence(block.overview.source, "mermaid");
      }
      if (block.modules?.length) {
        out += emitBlock(
          { type: "collection", variant: "panel", items: block.modules },
          ctx,
          levelOffset
        );
      }
      return out;
    }

    case "flowSteps":
      return block.steps
        .map(
          (
            step: { title: unknown; description?: unknown; status?: string },
            i: number
          ) => {
            const title = stripLeadingOrdinal(t(loc(step.title)));
            const status = step.status ? ` (${step.status})` : "";
            const desc = step.description
              ? `\n  ${tr(step.description as never)}`
              : "";
            return `${i + 1}. **${title}**${status}${desc}\n`;
          }
        )
        .join("")
        .concat("\n");

    case "decision": {
      let out = mdHeading(ctx.headingLevel, t(block.title));
      out += `_Status: ${block.status}_\n\n`;
      if (block.context) {
        out += `${tr(block.context)}\n\n`;
      }
      if (block.chosen) {
        out += `**Chosen:** ${t(block.chosen)}\n\n`;
      }
      if (block.rationale) {
        out += `${tr(block.rationale)}\n\n`;
      }
      if (block.options?.length) {
        for (const opt of block.options) {
          out += `- **${t(opt.label)}**`;
          if (opt.pros) {
            out += `\n  - Pros: ${tr(opt.pros as never)}`;
          }
          if (opt.cons) {
            out += `\n  - Cons: ${tr(opt.cons as never)}`;
          }
          out += "\n";
        }
        out += "\n";
      }
      return out;
    }

    case "risk": {
      let out = mdHeading(ctx.headingLevel, t(block.title));
      out += `_Severity: ${block.severity}_`;
      if (block.status) {
        out += ` · _Status: ${block.status}_`;
      }
      out += "\n\n";
      if (block.description) {
        out += `${tr(block.description)}\n\n`;
      }
      if (block.mitigation) {
        out += `**Mitigation:** ${tr(block.mitigation)}\n\n`;
      }
      return out;
    }

    case "assumption":
      return `- ${block.validated ? "[x]" : "[ ]"} ${tr(block.statement)}\n\n`;

    case "constraint": {
      const tag = block.nonNegotiable ? " _(non-negotiable)_" : "";
      return `- ${tr(block.rule)}${tag}\n\n`;
    }

    case "openQuestion": {
      const tag = block.blocking ? " _(blocking)_" : "";
      return `- ${tr(block.question)}${tag}\n\n`;
    }

    case "timeline":
      return block.events
        .map(
          (ev: {
            date?: string;
            title: unknown;
            description?: unknown;
            status?: string;
          }) => {
            const date = ev.date ? `${ev.date}: ` : "";
            const status = ev.status ? ` (${ev.status})` : "";
            const desc = ev.description
              ? `\n  ${tr(ev.description as never)}`
              : "";
            return `- ${date}**${t(loc(ev.title))}**${status}${desc}\n`;
          }
        )
        .join("")
        .concat("\n");

    case "roadmap":
      return block.phases
        .map(
          (phase: {
            title: unknown;
            timeframe?: unknown;
            goals?: unknown[];
            status?: string;
          }) => {
            let out = mdHeading(
              ctx.headingLevel + 1,
              `${t(loc(phase.title))}${phase.timeframe ? ` (${t(loc(phase.timeframe))})` : ""}`
            );
            if (phase.status) {
              out += `_Status: ${phase.status}_\n\n`;
            }
            if (phase.goals?.length) {
              out += phase.goals
                .map((g: unknown) => `- ${tr(g as never)}\n`)
                .join("");
              out += "\n";
            }
            return out;
          }
        )
        .join("");

    case "requirementTrace":
      return gfmTable(
        ["ID", "Summary", "Status", "Evidence"],
        block.items.map(
          (item: {
            reqId: string;
            summary?: unknown;
            status: string;
            evidence?: unknown;
          }) => [
            item.reqId,
            item.summary ? t(loc(item.summary)) : "",
            item.status,
            item.evidence ? tr(item.evidence as never) : "",
          ]
        )
      );

    case "testResult":
      return block.suites
        .map(
          (suite: {
            name: string;
            passed: number;
            failed: number;
            skipped?: number;
            notes?: unknown;
          }) => {
            const skip =
              suite.skipped != null ? `, skipped ${suite.skipped}` : "";
            let out = `- **${suite.name}**: ${suite.passed} passed, ${suite.failed} failed${skip}\n`;
            if (suite.notes) {
              out += `  ${tr(suite.notes as never)}\n`;
            }
            return out;
          }
        )
        .join("")
        .concat("\n");

    case "apiInventory":
      return gfmTable(
        ["Method", "Path", "Summary", "Status"],
        block.endpoints.map(
          (ep: {
            method: string;
            path: string;
            summary?: unknown;
            status?: string;
          }) => [
            ep.method,
            ep.path,
            ep.summary ? t(loc(ep.summary)) : "",
            ep.status ?? "",
          ]
        )
      );

    case "linkList": {
      let out = block.title ? mdHeading(ctx.headingLevel, t(block.title)) : "";
      out += block.links
        .map(
          (link: { href: string; label: unknown; description?: unknown }) => {
            const desc = link.description
              ? ` — ${tr(link.description as never)}`
              : "";
            return `- [${t(loc(link.label))}](${link.href})${desc}\n`;
          }
        )
        .join("");
      return `${out}\n`;
    }

    case "glossary":
      return block.terms
        .map(
          (term: { term: unknown; definition: unknown }) =>
            `- **${t(loc(term.term))}**: ${tr(term.definition as never)}\n`
        )
        .join("")
        .concat("\n");

    case "citation":
      return block.items
        .map(
          (item: { id: string; source: string; locator?: string }) =>
            `- [${item.id}] ${item.source}${item.locator ? ` (${item.locator})` : ""}\n`
        )
        .join("")
        .concat("\n");

    case "image": {
      const cap = block.caption ? `\n\n_${t(block.caption)}_` : "";
      return `![${t(block.alt)}](${block.src})${cap}\n\n`;
    }

    case "embed":
      return `[${block.title ? t(block.title) : block.url}](${block.url})\n\n`;

    case "collapsible": {
      let out = `<details${block.defaultOpen ? " open" : ""}>\n<summary>${t(block.summary)}</summary>\n\n`;
      out += emitChildren(block.children ?? [], ctx, levelOffset);
      out += "</details>\n\n";
      return out;
    }

    case "tabs":
      return block.panels
        .map((panel: { label: unknown; children: Block[] }) => {
          let out = mdHeading(ctx.headingLevel, t(loc(panel.label)));
          out += emitChildren(
            panel.children ?? [],
            childHeadingCtx(ctx, ctx.headingLevel),
            0
          );
          return out;
        })
        .join("");

    case "appendix": {
      let out = mdHeading(ctx.headingLevel, t(block.title));
      out += emitChildren(
        block.children ?? [],
        childHeadingCtx(ctx, ctx.headingLevel),
        0
      );
      return out;
    }

    case "agentNote":
      if (block.visible === false) {
        return "";
      }
      return `> _Agent note:_ ${tr(block.text)}\n\n`;

    default:
      return `<!-- unsupported block type: ${(block as { type?: string }).type ?? "unknown"} -->\n\n`;
  }
}

export function emitBlocks(
  blocks: Block[],
  doc: AirpDocument,
  locale: string
): string {
  const ctx = { ...createI18nContext(doc, locale), headingLevel: 2 };
  return emitChildren(blocks, ctx);
}
