import { Button } from "@/components/ui/button";
import { tRenderer } from "@/lib/renderer-i18n";
import type { AirpDocument } from "@/lib/airp-schema";
import type { RenderTarget } from "@/pipeline/types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";

export type ExportMenuProps = {
  doc: AirpDocument | null;
  uiLocale: string;
  exporting?: RenderTarget | null;
  onExportMarkdown?: (locale: string) => void;
  onExportHtmlAll?: () => void;
  onExportHtmlSingle?: (locale: string) => void;
};

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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button disabled={busy} size="sm" variant="secondary">
          {busy ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 size-4" />
          )}
          {tRenderer(uiLocale, "exportMenu")}
          <ChevronDown className="ml-1 size-3.5 opacity-70" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 min-w-[200px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          sideOffset={4}
        >
          {/* Markdown submenu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
              disabled={busy}
            >
              {tRenderer(uiLocale, "exportMarkdown")}
              <ChevronRight className="ml-2 size-3.5 opacity-70" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className="z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
                sideOffset={4}
              >
                {locales.map((locale) => (
                  <DropdownMenu.Item
                    key={locale}
                    className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
                    disabled={busy}
                    onSelect={() => onExportMarkdown?.(locale)}
                  >
                    {locale}
                    {exporting === "markdown" ? (
                      <Loader2 className="ml-auto size-3.5 animate-spin" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {/* HTML submenu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
              disabled={busy}
            >
              {tRenderer(uiLocale, "exportHtml")}
              <ChevronRight className="ml-2 size-3.5 opacity-70" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className="z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
                sideOffset={4}
              >
                {/* All languages option */}
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
                  disabled={busy}
                  onSelect={() => onExportHtmlAll?.()}
                >
                  {tRenderer(uiLocale, "exportHtmlAll")}
                  {exporting === "html" ? (
                    <Loader2 className="ml-auto size-3.5 animate-spin" />
                  ) : null}
                </DropdownMenu.Item>

                {/* Single locale options */}
                {locales.map((locale) => (
                  <DropdownMenu.Item
                    key={locale}
                    className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
                    disabled={busy}
                    onSelect={() => onExportHtmlSingle?.(locale)}
                  >
                    {locale}
                    {exporting === "html" ? (
                      <Loader2 className="ml-auto size-3.5 animate-spin" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
