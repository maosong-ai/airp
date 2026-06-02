import { BlockRenderer } from "@/components/block-renderer";
import type { AirpDocument } from "@/lib/airp-schema";
import { createI18nContext } from "@/lib/i18n";
import { collectToc } from "@/lib/toc";
import { cn } from "@/lib/utils";

export type ReportPageProps = {
  doc: AirpDocument;
  locale: string;
  staticMermaid?: boolean;
  showToc?: boolean;
};

export function ReportPage({
  doc,
  locale,
  staticMermaid = false,
  showToc = true,
}: ReportPageProps) {
  const ctx = createI18nContext(doc, locale);
  const toc = collectToc(doc.blocks, ctx);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[200px_1fr] lg:px-8">
      {showToc && toc.length > 0 ? (
        <nav className="top-24 hidden h-fit lg:sticky lg:block">
          <div className="mb-2 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
            {ctx.ui("toc", "Contents")}
          </div>
          <ul className="space-y-1 border-border border-l pl-3 text-sm">
            {toc.map((entry) => (
              <li key={entry.id}>
                <a
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href={`#${entry.id}`}
                >
                  {entry.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <div className="hidden lg:block" />
      )}

      <article className="min-w-0">
        <header className="mb-8 border-border border-b pb-6">
          <p className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {doc.meta.kind} · {doc.schemaVersion}
          </p>
          <h1 className="font-bold text-3xl tracking-tight">
            {ctx.t(doc.meta.title)}
          </h1>
          {doc.meta.subtitle ? (
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              {ctx.t(doc.meta.subtitle)}
            </p>
          ) : null}
          {doc.meta.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {doc.meta.tags.map((tag) => (
                <span
                  className={cn(
                    "rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px]"
                  )}
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <BlockRenderer
          blocks={doc.blocks}
          ctx={ctx}
          staticMermaid={staticMermaid}
        />
      </article>
    </div>
  );
}
