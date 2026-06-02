import type { I18nContext } from "@/lib/i18n";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { cn } from "@/lib/utils";
import type { RichText as RichTextType } from "@/lib/airp-schema";

type RichTextProps = {
  value: RichTextType | undefined;
  ctx: I18nContext;
  className?: string;
};

export function RichText({ value, ctx, className }: RichTextProps) {
  const raw = ctx.tr(value);
  if (!raw) {
    return null;
  }
  return (
    <span className={cn("report-prose", className)}>
      {renderMarkdownLite(raw)}
    </span>
  );
}
