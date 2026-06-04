import {
  ToolbarHoverMenu,
} from "@/components/toolbar-hover-menu";
import { ChromeLocalePanel } from "@/components/chrome/chrome-locale-panel";
import { IconLanguages } from "@/components/chrome/chrome-icons";
import { localeDisplayName, tRenderer } from "@/lib/renderer-i18n";
import { useState } from "react";

export interface LocaleMenuProps {
  uiLocale: string;
  /** Active document content locale. */
  value: string;
  locales: readonly string[];
  onChange: (locale: string) => void;
}

export function LocaleMenu({ uiLocale, value, locales, onChange }: LocaleMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <ToolbarHoverMenu
      align="end"
      ariaLabel={tRenderer(uiLocale, "localeMenu")}
      contentClassName="min-w-[200px]"
      icon={<IconLanguages />}
      onOpenChange={setOpen}
      open={open}
      title={localeDisplayName(value)}
    >
      <ChromeLocalePanel
        activeLocale={value}
        locales={locales}
        onLocaleChange={(loc) => {
          onChange(loc);
          setOpen(false);
        }}
        uiLocale={uiLocale}
      />
    </ToolbarHoverMenu>
  );
}
