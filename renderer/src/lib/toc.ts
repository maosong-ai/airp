import type { Block } from "@/lib/airp-schema";
import type { I18nContext } from "@/lib/i18n";
import { slugify } from "@/lib/i18n";

export type TocEntry = {
  id: string;
  title: string;
  level: number;
};

export function collectToc(
  blocks: Block[],
  ctx: I18nContext,
  acc: TocEntry[] = []
): TocEntry[] {
  for (const block of blocks) {
    if (block.type === "section") {
      const level = block.level ?? 2;
      if (level <= 2) {
        const title = ctx.t(block.title);
        acc.push({
          id: block.id ?? slugify(title),
          title,
          level,
        });
      }
      collectToc(block.children, ctx, acc);
    } else if (block.type === "group") {
      collectToc(block.children, ctx, acc);
    } else if (block.type === "tabs") {
      for (const panel of block.panels) {
        collectToc(panel.children, ctx, acc);
      }
    } else if (block.type === "collapsible") {
      collectToc(block.children, ctx, acc);
    } else if (block.type === "appendix") {
      acc.push({
        id: slugify(ctx.t(block.title)),
        title: ctx.t(block.title),
        level: 2,
      });
      collectToc(block.children, ctx, acc);
    }
  }
  return acc;
}
