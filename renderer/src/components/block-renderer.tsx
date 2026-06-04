import { AirpTabs } from "@/components/airp-tabs";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MermaidStaticShell } from "@/components/mermaid-static-shell";
import { RichText } from "@/components/rich-text";
import { formatCellValue, StatusBadge, statusToVariant } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Block } from "@/lib/airp-schema";
import { slugify, type I18nContext } from "@/lib/i18n";
import { tRenderer } from "@/lib/renderer-i18n";
import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { ClassValue } from "clsx";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FolderTree,
  Minus,
  Plus,
} from "lucide-react";

const blockRoot = (...classes: ClassValue[]) =>
  cn("w-full max-w-none", ...classes);

export type BlockRendererProps = {
  blocks: Block[];
  ctx: I18nContext;
  staticMermaid?: boolean;
};

export function BlockRenderer({
  blocks,
  ctx,
  staticMermaid = false,
}: BlockRendererProps) {
  return (
    <>
      {blocks.map((block, i) => (
        <BlockNode
          block={block}
          ctx={ctx}
          key={`${block.type}-${i}`}
          staticMermaid={staticMermaid}
        />
      ))}
    </>
  );
}

function BlockNode({
  block,
  ctx,
  staticMermaid,
}: {
  block: Block;
  ctx: I18nContext;
  staticMermaid: boolean;
}) {
  if (block.type === "agentNote" && block.visible !== true) {
    return null;
  }

  switch (block.type) {
    case "hero":
      return (
        <div className={blockRoot("collection-grid mb-8")}>
          {block.metrics.map((m, i) => (
            <div className="collection-metric" key={i}>
              {m.title ? (
                <div className="font-mono text-[10px] text-report-text-dim uppercase tracking-wide">
                  {ctx.t(m.title)}
                </div>
              ) : null}
              <div className="mt-1 font-bold text-2xl tabular-nums">
                {m.value}
              </div>
              {m.delta ? (
                <div
                  className={cn(
                    "mt-1 font-mono text-xs font-semibold",
                    m.tone === "positive" && "text-report-green",
                    m.tone === "warning" && "text-report-amber",
                    m.tone === "negative" && "text-report-red"
                  )}
                >
                  {ctx.t(m.delta)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      );

    case "section": {
      const level = block.level ?? 2;
      const headingLevel = Math.min(level + 1, 4);
      const id = block.id ?? slugify(ctx.t(block.title));
      const title = ctx.t(block.title);
      const TitleTag = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h4";
      return (
        <section className={blockRoot("airp-section")} id={id}>
          <header className="airp-section-header">
            <TitleTag className="airp-section-title">{title}</TitleTag>
          </header>
          <div className="airp-section-body">
            {block.lead ? (
              <p className="lead mb-4 text-lg text-muted-foreground">
                <RichText ctx={ctx} value={block.lead} />
              </p>
            ) : null}
            <BlockRenderer
              blocks={block.children}
              ctx={ctx}
              staticMermaid={staticMermaid}
            />
          </div>
        </section>
      );
    }

    case "group":
      return (
        <div className={blockRoot("mb-6")}>
          {block.title ? (
            <h3 className="mb-3 font-semibold text-base">{ctx.t(block.title)}</h3>
          ) : null}
          <BlockRenderer
            blocks={block.children}
            ctx={ctx}
            staticMermaid={staticMermaid}
          />
        </div>
      );

    case "divider":
      return (
        <hr className={blockRoot("my-8 border-border")} />
      );

    case "spacer": {
      const h =
        block.size === "sm" ? "h-4" : block.size === "lg" ? "h-12" : "h-8";
      return <div className={blockRoot(h)} />;
    }

    case "heading": {
      const className = blockRoot("mb-3 font-semibold text-xl");
      const text = ctx.t(block.text);
      if (block.level === 1) {
        return <h1 className={className} id={block.id}>{text}</h1>;
      }
      if (block.level === 2) {
        return <h2 className={className} id={block.id}>{text}</h2>;
      }
      if (block.level === 3) {
        return <h3 className={className} id={block.id}>{text}</h3>;
      }
      if (block.level === 4) {
        return <h4 className={className} id={block.id}>{text}</h4>;
      }
      if (block.level === 5) {
        return <h5 className={className} id={block.id}>{text}</h5>;
      }
      return <h6 className={className} id={block.id}>{text}</h6>;
    }

    case "paragraph":
      return (
        <p className={blockRoot("report-prose mb-4 text-[15px] leading-relaxed")}>
          <RichText ctx={ctx} value={block.text} />
        </p>
      );

    case "lead":
      return (
        <p className={blockRoot("mb-4 text-lg text-muted-foreground leading-relaxed")}>
          <RichText ctx={ctx} value={block.text} />
        </p>
      );

    case "pullQuote":
      return (
        <blockquote className={blockRoot("my-6 border-report-accent border-l-4 pl-5 text-lg text-muted-foreground italic")}>
          {ctx.t(block.text)}
        </blockquote>
      );

    case "blockquote":
      return (
        <blockquote className={blockRoot("my-4 border-border border-l-4 pl-4 text-muted-foreground")}>
          <RichText ctx={ctx} value={block.text} />
        </blockquote>
      );

    case "callout": {
      const variants: Record<string, string> = {
        info: "border-teal-500 bg-teal-500/10",
        tip: "border-report-green bg-report-green-dim",
        success: "border-report-green bg-report-green-dim",
        warning: "border-report-amber bg-report-amber-dim",
        danger: "border-report-red bg-report-red-dim",
      };
      const v = block.variant ?? "info";
      return (
        <div
          className={blockRoot(
            "my-4 rounded-r-lg border-l-4 py-3 pr-4 pl-4 text-sm",
            variants[v]
          )}
        >
          {block.title ? (
            <strong className="mb-1 block">{ctx.t(block.title)}</strong>
          ) : null}
          <RichText ctx={ctx} value={block.body} />
        </div>
      );
    }

    case "bulletList":
      return (
        <ul className={blockRoot("mb-4 list-disc space-y-2 pl-6")}>
          {block.items.map((item, i) => (
            <li className="report-prose" key={i}>
              <RichText ctx={ctx} value={item} />
            </li>
          ))}
        </ul>
      );

    case "numberedList":
      return (
        <ol className={blockRoot("mb-4 list-decimal space-y-2 pl-6")}>
          {block.items.map((item, i) => (
            <li className="report-prose" key={i}>
              <RichText ctx={ctx} value={item} />
            </li>
          ))}
        </ol>
      );

    case "checklist":
      return (
        <ul className={blockRoot("mb-4 space-y-2")}>
          {block.items.map((item, i) => (
            <li className="flex gap-2 text-sm" key={i}>
              <span aria-hidden>{item.checked ? "☑" : "☐"}</span>
              <span className="report-prose flex-1">
                <RichText ctx={ctx} value={item.label} />
              </span>
              {item.status ? (
                <StatusBadge status={item.status} />
              ) : null}
            </li>
          ))}
        </ul>
      );

    case "definitionList":
      return (
        <dl className={blockRoot("mb-4 space-y-3")}>
          {block.items.map((item, i) => (
            <div key={i}>
              <dt className="font-semibold text-sm">{ctx.t(item.term)}</dt>
              <dd className="mt-1 text-muted-foreground text-sm">
                <RichText ctx={ctx} value={item.definition} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return (
        <div className={blockRoot("airp-table-wrap my-4")}>
          <table className="airp-data-table min-w-[640px]">
            {block.caption ? (
              <caption>{ctx.t(block.caption)}</caption>
            ) : null}
            <thead>
              <tr>
                {block.columns.map((col) => (
                  <th
                    className={cn(col.align === "end" && "text-right")}
                    key={col.key}
                  >
                    {ctx.t(col.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {block.columns.map((col) => (
                    <td
                      className={cn(
                        col.align === "end" && "text-right tabular-nums"
                      )}
                      key={col.key}
                    >
                      {formatCellValue(row[col.key], col.cellKind, ctx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "comparison":
      return (
        <div className={blockRoot("comparison-grid my-6")}>
          <div className="rounded-lg border border-border border-t-4 border-t-report-amber bg-card p-4 min-w-0">
            <h4 className="mb-3 font-mono text-[10px] text-muted-foreground uppercase">
              {block.labelBefore
                ? ctx.t(block.labelBefore)
                : ctx.ui("comparisonBefore", "Before")}
            </h4>
            <BlockRenderer
              blocks={block.before}
              ctx={ctx}
              staticMermaid={staticMermaid}
            />
          </div>
          <div className="comparison-arrow">→</div>
          <div className="rounded-lg border border-border border-t-4 border-t-report-green bg-card p-4 min-w-0">
            <h4 className="mb-3 font-mono text-[10px] text-muted-foreground uppercase">
              {block.labelAfter
                ? ctx.t(block.labelAfter)
                : ctx.ui("comparisonAfter", "After")}
            </h4>
            <BlockRenderer
              blocks={block.after}
              ctx={ctx}
              staticMermaid={staticMermaid}
            />
          </div>
        </div>
      );

    case "collection": {
      const isMetric =
        block.variant === "metric" || block.variant === "stat";
      return (
        <div className={blockRoot("my-4")}>
          {block.title ? (
            <h4 className="mb-3 font-semibold text-sm">{ctx.t(block.title)}</h4>
          ) : null}
          <div className="collection-grid">
            {block.items.map((item, i) => (
              <div
                className={cn(
                  isMetric ? "collection-metric" : "collection-card",
                  block.variant === "compact" && "p-3 text-sm"
                )}
                key={i}
              >
                {item.title ? (
                  <div className="font-medium">{ctx.t(item.title)}</div>
                ) : null}
                {item.value !== undefined ? (
                  <div className="font-bold text-xl tabular-nums">
                    {item.value}
                    {item.unit ? (
                      <span className="ml-1 font-normal text-muted-foreground text-sm">
                        {ctx.t(item.unit)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-muted-foreground text-sm">
                    <RichText ctx={ctx} value={item.description} />
                  </p>
                ) : null}
                {item.badges?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.badges.map((b, bi) => (
                      <Badge
                        key={bi}
                        variant={
                          b.status
                            ? statusToVariant(b.status)
                            : "neutral"
                        }
                      >
                        {ctx.t(b.label)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {item.children?.length ? (
                  <div className="mt-3">
                    <BlockRenderer
                      blocks={item.children}
                      ctx={ctx}
                      staticMermaid={staticMermaid}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "keyValueList":
      return (
        <dl
          className={blockRoot(
            "my-4 gap-3",
            block.layout === "inline"
              ? "flex flex-wrap"
              : "grid sm:grid-cols-2"
          )}
        >
          {block.items.map((item, i) => (
            <div className="min-w-0" key={i}>
              <dt className="font-mono text-muted-foreground text-xs">
                {ctx.t(item.key)}
              </dt>
              <dd className="mt-0.5 text-sm">
                <RichText ctx={ctx} value={item.value} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "statusBoard":
      return (
        <div className={blockRoot("my-4 grid gap-2 sm:grid-cols-2")}>
          {block.items.map((item, i) => (
            <div
              className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3"
              key={i}
            >
              <div>
                <div className="font-medium text-sm">{ctx.t(item.label)}</div>
                {item.detail ? (
                  <p className="mt-1 text-muted-foreground text-xs">
                    <RichText ctx={ctx} value={item.detail} />
                  </p>
                ) : null}
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      );

    case "code":
      return (
        <div className={blockRoot("my-4 overflow-hidden rounded-lg border border-border bg-card")}>
          {block.filename ? (
            <div className="border-border border-b bg-muted/50 px-3 py-1.5 font-mono text-muted-foreground text-xs">
              {block.filename}
            </div>
          ) : null}
          <pre className="overflow-x-auto bg-muted p-4 font-mono text-xs leading-relaxed">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case "codeDiff": {
      const body =
        block.unified ??
        `--- before\n+++ after\n${block.before ?? ""}\n${block.after ?? ""}`;
      return (
        <div className={blockRoot("my-4 overflow-hidden rounded-lg border border-border bg-card")}>
          {block.filename ? (
            <div className="border-border border-b bg-muted/50 px-3 py-1.5 font-mono text-muted-foreground text-xs">
              {block.filename}
            </div>
          ) : null}
          <pre className="overflow-x-auto bg-muted p-4 font-mono text-xs leading-relaxed">
            <code>{body}</code>
          </pre>
        </div>
      );
    }

    case "fileTree":
      return (
        <div
          className={blockRoot(
            "airp-file-tree my-4 rounded-xl border border-border bg-card p-4 font-mono text-xs"
          )}
          data-airp-file-tree
        >
          <div className="airp-file-tree-toolbar">
            <div className="airp-file-tree-toolbar-title-wrap">
              <FolderTree aria-hidden className="airp-file-tree-toolbar-icon" />
              <span className="airp-file-tree-toolbar-title">
                {ctx.ui("fileTreeToolbarTitle", tRenderer(ctx.locale, "fileTreeToolbarTitle"))}
              </span>
            </div>
            <div className="airp-file-tree-toolbar-actions">
              <button
                className="airp-file-tree-toolbar-button"
                data-airp-file-tree-action="expand-all"
                onClick={(event) => {
                  const container = event.currentTarget.closest("[data-airp-file-tree]");
                  if (container instanceof HTMLElement) {
                    setAllFileTreeNodesOpen(container, true);
                  }
                }}
                type="button"
              >
                <Plus aria-hidden className="airp-file-tree-toolbar-button-icon" />
                {ctx.ui("fileTreeExpandAll", tRenderer(ctx.locale, "fileTreeExpandAll"))}
              </button>
              <button
                className="airp-file-tree-toolbar-button"
                data-airp-file-tree-action="collapse-all"
                onClick={(event) => {
                  const container = event.currentTarget.closest("[data-airp-file-tree]");
                  if (container instanceof HTMLElement) {
                    setAllFileTreeNodesOpen(container, false);
                  }
                }}
                type="button"
              >
                <Minus aria-hidden className="airp-file-tree-toolbar-button-icon" />
                {ctx.ui("fileTreeCollapseAll", tRenderer(ctx.locale, "fileTreeCollapseAll"))}
              </button>
            </div>
          </div>
          {block.caption ? (
            <p className="relative mb-3 font-sans text-muted-foreground text-xs">
              {ctx.t(block.caption)}
            </p>
          ) : null}
          <div className="airp-file-tree-body">
            <FileTreeNode ctx={ctx} node={block.root} depth={0} />
          </div>
        </div>
      );

    case "fileChangeList":
      return (
        <ul className={blockRoot("my-4 space-y-1 font-mono text-xs")}>
          {block.items.map((item, i) => (
            <li className="flex flex-wrap gap-2" key={i}>
              <ChangeBadge change={item.change} />
              <code>{item.path}</code>
              {item.note ? (
                <span className="text-muted-foreground">
                  <RichText ctx={ctx} value={item.note} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      );

    case "mermaid": {
      const hint = ctx.ui(
        "diagramHint",
        "Ctrl/Cmd + scroll to zoom · drag to pan · double-click to fit · ⛶ fullscreen"
      );
      const title = block.title ? ctx.t(block.title) : undefined;
      if (staticMermaid) {
        return (
          <div className={blockRoot()}>
            <MermaidStaticShell hint={hint} source={block.source} title={title} />
          </div>
        );
      }
      return (
        <div className={blockRoot()}>
          <MermaidDiagram hint={hint} source={block.source} title={title} />
        </div>
      );
    }

    case "architectureOverview":
      return (
        <div className={blockRoot("my-6 space-y-6")}>
          {block.overview ? (
            staticMermaid ? (
              <MermaidStaticShell source={block.overview.source} />
            ) : (
              <MermaidDiagram source={block.overview.source} />
            )
          ) : null}
          {block.modules?.length ? (
            <div className="collection-grid">
              {block.modules.map((m, i) => (
                <div className="collection-card" key={i}>
                  <div className="font-semibold">{ctx.t(m.title)}</div>
                  {m.description ? (
                    <p className="mt-2 text-muted-foreground text-sm">
                      <RichText ctx={ctx} value={m.description} />
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );

    case "flowSteps":
      return (
        <ol className={blockRoot("my-4 space-y-0")}>
          {block.steps.map((step, i) => (
            <li
              className="relative border-border border-l-2 py-3 pl-10"
              key={i}
            >
              <span className="absolute top-3 left-0 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-muted font-mono font-semibold text-report-accent text-xs">
                {i + 1}
              </span>
              <div className="font-medium">{ctx.t(step.title)}</div>
              {step.description ? (
                <p className="mt-1 text-muted-foreground text-sm">
                  <RichText ctx={ctx} value={step.description} />
                </p>
              ) : null}
              {step.status ? (
                <div className="mt-2">
                  <StatusBadge status={step.status} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      );

    case "decision":
      return (
        <Card className={blockRoot("my-4")}>
          <CardHeader>
            <CardTitle className="text-base">{ctx.t(block.title)}</CardTitle>
            <StatusBadge status={block.status} />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {block.context ? <RichText ctx={ctx} value={block.context} /> : null}
            {block.chosen ? (
              <p>
                <strong>Chosen:</strong> {ctx.t(block.chosen)}
              </p>
            ) : null}
            {block.rationale ? (
              <RichText ctx={ctx} value={block.rationale} />
            ) : null}
          </CardContent>
        </Card>
      );

    case "risk":
      return (
        <Card className={blockRoot("my-4 border-l-4 border-l-report-red")}>
          <CardHeader>
            <CardTitle className="text-base">{ctx.t(block.title)}</CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={block.severity} />
              {block.status ? <StatusBadge status={block.status} /> : null}
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {block.description ? (
              <RichText ctx={ctx} value={block.description} />
            ) : null}
            {block.mitigation ? (
              <p className="mt-2">
                <strong>Mitigation:</strong>{" "}
                <RichText ctx={ctx} value={block.mitigation} />
              </p>
            ) : null}
          </CardContent>
        </Card>
      );

    case "assumption":
    case "constraint":
    case "openQuestion":
      return (
        <Card className={blockRoot("my-3")}>
          <CardContent className="pt-4 text-sm">
            <RichText
              ctx={ctx}
              value={
                block.type === "assumption"
                  ? block.statement
                  : block.type === "constraint"
                    ? block.rule
                    : block.question
              }
            />
          </CardContent>
        </Card>
      );

    case "timeline":
      return (
        <div className={blockRoot("my-6 border-report-accent border-l-2 pl-6")}>
          {block.events.map((ev, i) => (
            <div className="relative pb-8 last:pb-0" key={i}>
              <span className="absolute top-1 -left-[31px] size-3 rounded-full bg-report-accent" />
              {ev.date ? (
                <div className="font-mono text-muted-foreground text-xs">
                  {ev.date}
                </div>
              ) : null}
              <div className="font-semibold">{ctx.t(ev.title)}</div>
              {ev.description ? (
                <p className="mt-1 text-muted-foreground text-sm">
                  <RichText ctx={ctx} value={ev.description} />
                </p>
              ) : null}
            </div>
          ))}
        </div>
      );

    case "roadmap":
      return (
        <div className={blockRoot("my-4 space-y-4")}>
          {block.phases.map((phase, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">{ctx.t(phase.title)}</CardTitle>
                {phase.timeframe ? (
                  <span className="font-mono text-muted-foreground text-xs">
                    {ctx.t(phase.timeframe)}
                  </span>
                ) : null}
              </CardHeader>
              {phase.goals?.length ? (
                <CardContent>
                  <ul className="list-disc pl-5 text-sm">
                    {phase.goals.map((g, gi) => (
                      <li key={gi}>
                        <RichText ctx={ctx} value={g} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      );

    case "requirementTrace":
      return (
        <div className={blockRoot("airp-table-wrap my-4")}>
          <table className="airp-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {block.items.map((item, i) => (
                <tr key={i}>
                  <td className="font-mono">{item.reqId}</td>
                  <td>{item.summary ? ctx.t(item.summary) : "—"}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "testResult":
      return (
        <div className={blockRoot("my-4 grid gap-3 sm:grid-cols-2")}>
          {block.suites.map((suite, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-sm">{suite.name}</CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-sm tabular-nums">
                <span className="text-report-green">{suite.passed} pass</span>
                {" · "}
                <span className="text-report-red">{suite.failed} fail</span>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case "apiInventory":
      return (
        <div className={blockRoot("airp-table-wrap my-4")}>
          <table className="airp-data-table airp-data-table--mono">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {block.endpoints.map((ep, i) => (
                <tr key={i}>
                  <td>{ep.method}</td>
                  <td>{ep.path}</td>
                  <td className="font-sans">
                    {ep.summary ? ctx.t(ep.summary) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "linkList":
      return (
        <ul className={blockRoot("my-4 space-y-2")}>
          {block.links.map((link, i) => (
            <li key={i}>
              <a
                className="text-primary underline"
                href={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {ctx.t(link.label)}
              </a>
            </li>
          ))}
        </ul>
      );

    case "glossary":
      return (
        <dl className={blockRoot("airp-glossary")}>
          {block.terms.map((t, i) => (
            <div className="airp-glossary-row" key={i}>
              <dt className="font-semibold text-sm">{ctx.t(t.term)}</dt>
              <dd className="text-muted-foreground text-sm">
                <RichText ctx={ctx} value={t.definition} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "citation":
      return (
        <ol className={blockRoot("my-4 list-decimal space-y-1 pl-6 text-sm")}>
          {block.items.map((c, i) => (
            <li id={`cite-${c.id}`} key={i}>
              <code>{c.id}</code> — {c.source}
              {c.locator ? ` (${c.locator})` : ""}
            </li>
          ))}
        </ol>
      );

    case "image":
      return (
        <figure className={blockRoot("my-4")}>
          <img
            alt={ctx.t(block.alt)}
            className="max-w-full rounded-lg border border-border"
            src={block.src}
          />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-muted-foreground text-xs">
              {ctx.t(block.caption)}
            </figcaption>
          ) : null}
        </figure>
      );

    case "embed":
      return (
        <div className={blockRoot("my-4")}>
          <a
            className="text-primary underline"
            href={block.url}
            rel="noreferrer"
            target="_blank"
          >
            {block.title ? ctx.t(block.title) : block.url}
          </a>
        </div>
      );

    case "collapsible":
      return (
        <Collapsible.Root
          className={blockRoot("my-4 rounded-lg border border-border")}
          defaultOpen={block.defaultOpen}
        >
          <Collapsible.Trigger className="flex w-full items-center justify-between px-4 py-3 font-medium text-sm hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
            {ctx.t(block.summary)}
            <ChevronDown className="size-4 transition-transform" />
          </Collapsible.Trigger>
          <Collapsible.Content className="border-border border-t px-4 py-3">
            <BlockRenderer
              blocks={block.children}
              ctx={ctx}
              staticMermaid={staticMermaid}
            />
          </Collapsible.Content>
        </Collapsible.Root>
      );

    case "tabs":
      return (
        <AirpTabs
          className={blockRoot("my-4")}
          ctx={ctx}
          panels={block.panels}
          renderPanel={(children) => (
            <BlockRenderer
              blocks={children}
              ctx={ctx}
              staticMermaid={staticMermaid}
            />
          )}
        />
      );

    case "appendix":
      return (
        <section className={blockRoot("mt-12 rounded-lg border border-dashed border-border bg-muted/20 p-6")}>
          <h2 className="mb-4 font-semibold text-lg">{ctx.t(block.title)}</h2>
          <BlockRenderer
            blocks={block.children}
            ctx={ctx}
            staticMermaid={staticMermaid}
          />
        </section>
      );

    case "agentNote":
      return (
        <aside className={blockRoot("my-2 rounded border border-dashed border-border bg-muted/30 p-3 text-muted-foreground text-xs")}>
          <RichText ctx={ctx} value={block.text} />
        </aside>
      );

    default: {
      const unknown = block as { type?: string };
      return (
        <pre className={blockRoot("my-2 overflow-x-auto rounded bg-muted p-2 text-xs")}>
          Unknown block: {unknown.type ?? "?"}
        </pre>
      );
    }
  }
}

function ChangeBadge({ change }: { change: string }) {
  const colors: Record<string, string> = {
    added: "text-report-green",
    modified: "text-report-amber",
    deleted: "text-report-red line-through opacity-70",
    renamed: "text-report-accent",
    unchanged: "text-muted-foreground",
  };
  return (
    <span className={cn("font-semibold uppercase", colors[change] ?? "")}>
      {change}
    </span>
  );
}

type FileTreeNodeData = {
  name: string;
  change?: string;
  annotation?: import("@/lib/airp-schema").LocalizedString;
  children?: FileTreeNodeData[];
};

function setAllFileTreeNodesOpen(container: HTMLElement, open: boolean) {
  const nodes = container.querySelectorAll("[data-airp-file-tree-node]");
  nodes.forEach((node) => {
    if (!(node instanceof HTMLDetailsElement)) {
      return;
    }
    node.open = open;
  });
}

function FileTreeNode({
  node,
  depth,
  ctx,
}: {
  node: FileTreeNodeData;
  depth: number;
  ctx: I18nContext;
}) {
  const pad = depth * 14;
  const hasChildren = Boolean(node.children?.length);

  if (hasChildren) {
    return (
      <details className="airp-file-tree-node" data-airp-file-tree-node open={depth <= 1}>
        <summary className="airp-file-tree-row" style={{ paddingLeft: pad }}>
          <span aria-hidden className="airp-file-tree-caret">
            <ChevronRight className="airp-file-tree-caret-icon" />
          </span>
          <span aria-hidden className="airp-file-tree-node-icon">
            <Folder className="airp-file-tree-folder-closed" />
            <FolderOpen className="airp-file-tree-folder-open" />
          </span>
          {node.change ? <ChangeBadge change={node.change} /> : null}
          <span
            className={cn(
              "airp-file-tree-name",
              node.change === "deleted" && "line-through opacity-60",
              node.change === "added" && "font-bold text-report-green"
            )}
          >
            {node.name}
          </span>
          {node.annotation ? (
            <span className="airp-file-tree-annotation">
              <em>({ctx.t(node.annotation)})</em>
            </span>
          ) : null}
        </summary>
        <div className="airp-file-tree-children">
          {node.children?.map((child, i) => (
            <FileTreeNode ctx={ctx} depth={depth + 1} key={i} node={child} />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="airp-file-tree-row airp-file-tree-row--leaf" style={{ paddingLeft: pad }}>
      <span aria-hidden className="airp-file-tree-caret airp-file-tree-caret--placeholder" />
      <span aria-hidden className="airp-file-tree-node-icon airp-file-tree-node-icon--file">
        <File className="airp-file-tree-file" />
      </span>
      {node.change ? <ChangeBadge change={node.change} /> : null}
      <span
        className={cn(
          "airp-file-tree-name",
          node.change === "deleted" && "line-through opacity-60",
          node.change === "added" && "font-bold text-report-green"
        )}
      >
        {node.name}
      </span>
      {node.annotation ? (
        <span className="airp-file-tree-annotation">
          <em>({ctx.t(node.annotation)})</em>
        </span>
      ) : null}
    </div>
  );
}
