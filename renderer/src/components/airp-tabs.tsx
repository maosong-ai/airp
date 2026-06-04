import type { Block } from "@/lib/airp-schema";
import type { I18nContext } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ClassValue } from "clsx";
import { useState, type ReactNode } from "react";

type AirpTabsProps = {
  panels: Array<{ label: unknown; children: Block[] }>;
  ctx: I18nContext;
  className?: ClassValue;
  renderPanel: (children: Block[]) => ReactNode;
};

export function AirpTabs({
  panels,
  ctx,
  className,
  renderPanel,
}: AirpTabsProps) {
  const [active, setActive] = useState(0);

  return (
    <div className={cn("airp-tabs", className)} data-airp-tabs>
      <div className="airp-tabs-list" role="tablist">
        {panels.map((panel, i) => (
          <button
            aria-selected={active === i}
            className={cn("airp-tabs-trigger", active === i && "is-active")}
            data-airp-tab={String(i)}
            key={i}
            onClick={() => setActive(i)}
            role="tab"
            type="button"
          >
            {ctx.t(panel.label as never)}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div
          className="airp-tabs-panel"
          data-airp-tab-panel={String(i)}
          hidden={active !== i}
          key={i}
          role="tabpanel"
        >
          {renderPanel(panel.children)}
        </div>
      ))}
    </div>
  );
}
