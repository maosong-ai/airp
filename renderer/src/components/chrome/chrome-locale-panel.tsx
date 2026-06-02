import { ChromeMenuSection } from "@/components/chrome/chrome-menu-section";
import { cn } from "@/lib/utils";
import {
  localeDisplayName,
  localeFlagEmoji,
  tRenderer,
} from "@/lib/renderer-i18n";

export type ChromeLocalePanelProps = {
  uiLocale: string;
  locales: readonly string[];
  activeLocale: string;
  onLocaleChange?: (locale: string) => void;
};

export function ChromeLocalePanel({
  uiLocale,
  locales,
  activeLocale,
  onLocaleChange,
}: ChromeLocalePanelProps) {
  return (
    <ChromeMenuSection
      title={tRenderer(uiLocale, "localeMenu")}
      titleI18nKey="locale-menu"
    >
      <div className="flex flex-col gap-0.5">
        {locales.map((loc) => {
          const active = loc === activeLocale;
          return (
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                "aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground"
              )}
              aria-pressed={active}
              data-airp-locale-option={loc}
              key={loc}
              onClick={
                onLocaleChange ? () => onLocaleChange(loc) : undefined
              }
              type="button"
            >
              <span aria-hidden className="text-base leading-none">
                {localeFlagEmoji(loc)}
              </span>
              <span data-airp-locale-label>{localeDisplayName(loc)}</span>
            </button>
          );
        })}
      </div>
    </ChromeMenuSection>
  );
}
