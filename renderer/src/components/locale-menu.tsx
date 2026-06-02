import {
  ToolbarHoverMenu,
} from "@/components/toolbar-hover-menu";
import { ChromeLocalePanel } from "@/components/chrome/chrome-locale-panel";
import { IconLanguages } from "@/components/chrome/chrome-icons";
import { rendererConfig } from "@/config/renderer-config";
import type { AirpDocument } from "@/lib/airp-schema";
import { localeDisplayName, tRenderer } from "@/lib/renderer-i18n";

export interface LocaleMenuProps {
  uiLocale: string;
  /** Active document content locale (or renderer locale when no doc). */
  value: string;
  doc: AirpDocument | null;
  onChange: (locale: string) => void;
}

export function LocaleMenu({ uiLocale, value, doc, onChange }: LocaleMenuProps) {
  const options = doc
    ? doc.i18n.locales
    : [...rendererConfig.locales];

  return (
    <ToolbarHoverMenu
      align="end"
      ariaLabel={tRenderer(uiLocale, "localeMenu")}
      contentClassName="min-w-[200px]"
      icon={<IconLanguages />}
      title={localeDisplayName(value)}
    >
      <ChromeLocalePanel
        activeLocale={value}
        locales={options}
        onLocaleChange={onChange}
        uiLocale={uiLocale}
      />
    </ToolbarHoverMenu>
  );
}
