import type { ReactNode } from "react";

export function ChromeMenuSection({
  title,
  titleI18nKey,
  children,
}: {
  title: string;
  /** For static export: `data-airp-i18n` on the heading. */
  titleI18nKey?: string;
  children: ReactNode;
}) {
  return (
    <div className="py-1">
      <div
        className="px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wide"
        {...(titleI18nKey ? { "data-airp-i18n": titleI18nKey } : {})}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
