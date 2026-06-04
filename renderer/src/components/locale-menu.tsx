import {
  ToolbarHoverMenu,
} from "@/components/toolbar-hover-menu";
import { ChromeLocalePanel } from "@/components/chrome/chrome-locale-panel";
import { IconLanguages } from "@/components/chrome/chrome-icons";
import { localeDisplayName, tRenderer } from "@/lib/renderer-i18n";

export interface LocaleMenuProps {
  uiLocale: string;
  /** Active document content locale. */
  value: string;
  locales: readonly string[];
  onChange: (locale: string) => void;
}

export function LocaleMenu({ uiLocale, value, locales, onChange }: LocaleMenuProps) {
  const options = locales;

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
