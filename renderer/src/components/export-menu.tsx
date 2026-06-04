import { Button } from "@/components/ui/button";
import {
  ToolbarHoverMenu,
  ToolbarMenuItem,
} from "@/components/toolbar-hover-menu";
import { tRenderer } from "@/lib/renderer-i18n";
import type { AirpDocument } from "@/lib/airp-schema";
import type { RenderTarget } from "@/pipeline/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type ExportMenuProps = {
  doc: AirpDocument | null;
  uiLocale: string;
  exporting?: RenderTarget | null;
  onExportMarkdown?: (locale: string) => void;
  onExportHtmlAll?: () => void;
  onExportHtmlSingle?: (locale: string) => void;
};

function ExportSpinner({ show }: { show: boolean }) {
  if (!show) return null;
  return <Loader2 className="ml-auto size-3.5 animate-spin" />;
}

function ExportSubmenu({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/export-sub relative",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
        <span>{label}</span>
        <ChevronRight className="size-3.5 opacity-70" />
      </div>
      <div className="invisible absolute top-0 left-full z-50 ml-1 min-w-[140px] rounded-lg border border-border bg-card p-1 opacity-0 shadow-md transition-opacity group-hover/export-sub:visible group-hover/export-sub:opacity-100">
        {children}
      </div>
    </div>
  );
}

export function ExportMenu({
  doc,
  uiLocale,
  exporting,
  onExportMarkdown,
  onExportHtmlAll,
  onExportHtmlSingle,
}: ExportMenuProps) {
  const busy = exporting != null;
  const locales = doc?.i18n.locales ?? [];
  const multiLocale = locales.length > 1;
  const singleLocale = locales.length === 1 ? locales[0]! : null;

  const trigger = (
    <Button disabled={busy} size="sm" type="button" variant="secondary">
      {busy ? (
        <Loader2 className="mr-1.5 size-4 animate-spin" />
      ) : (
        <Download className="mr-1.5 size-4" />
      )}
      {tRenderer(uiLocale, "exportMenu")}
      <ChevronDown className="ml-1 size-3.5 opacity-70" />
    </Button>
  );

  return (
    <ToolbarHoverMenu
      align="start"
      ariaLabel={tRenderer(uiLocale, "exportMenu")}
      contentClassName="min-w-[200px] p-1"
      trigger={trigger}
    >
      {multiLocale ? (
        <div className="flex flex-col gap-0.5">
          <ExportSubmenu
            disabled={busy}
            label={tRenderer(uiLocale, "exportMarkdown")}
          >
            {locales.map((locale) => (
              <ToolbarMenuItem
                disabled={busy}
                key={locale}
                onClick={() => onExportMarkdown?.(locale)}
              >
                {locale}
                <ExportSpinner show={exporting === "markdown"} />
              </ToolbarMenuItem>
            ))}
          </ExportSubmenu>

          <ExportSubmenu disabled={busy} label={tRenderer(uiLocale, "exportHtml")}>
            <ToolbarMenuItem disabled={busy} onClick={() => onExportHtmlAll?.()}>
              {tRenderer(uiLocale, "exportHtmlAll")}
              <ExportSpinner show={exporting === "html"} />
            </ToolbarMenuItem>
            {locales.map((locale) => (
              <ToolbarMenuItem
                disabled={busy}
                key={locale}
                onClick={() => onExportHtmlSingle?.(locale)}
              >
                {locale}
                <ExportSpinner show={exporting === "html"} />
              </ToolbarMenuItem>
            ))}
          </ExportSubmenu>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <ToolbarMenuItem
            disabled={busy || !singleLocale}
            onClick={() => singleLocale && onExportMarkdown?.(singleLocale)}
          >
            {tRenderer(uiLocale, "exportMarkdown")}
            <ExportSpinner show={exporting === "markdown"} />
          </ToolbarMenuItem>
          <ToolbarMenuItem
            disabled={busy || !singleLocale}
            onClick={() => singleLocale && onExportHtmlSingle?.(singleLocale)}
          >
            {tRenderer(uiLocale, "exportHtml")}
            <ExportSpinner show={exporting === "html"} />
          </ToolbarMenuItem>
        </div>
      )}
    </ToolbarHoverMenu>
  );
}
