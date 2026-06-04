import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface StaticChromePopoverProps {
  id: string;
  ariaLabel: string;
  title?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  triggerAttributes?: Record<string, string | number | boolean | undefined>;
  align?: "start" | "end";
  /** Dashboard parity: locale uses hover; theme uses click. */
  interaction?: "click" | "hover";
}

export function StaticChromePopover({
  id,
  ariaLabel,
  title,
  icon,
  children,
  className,
  panelClassName,
  triggerAttributes,
  align = "end",
  interaction = "click",
}: StaticChromePopoverProps) {
  const panelId = `${id}-panel`;
  return (
    <div
      className={cn("relative", className)}
      data-airp-popover-root
      data-airp-popover-align={align}
      {...(interaction === "hover" ? { "data-airp-popover-hover": true } : {})}
    >
      <Button
        aria-controls={panelId}
        aria-expanded={false}
        aria-label={ariaLabel}
        data-airp-popover-trigger
        {...(triggerAttributes ?? {})}
        size="icon"
        title={title}
        type="button"
        variant="ghost"
      >
        {icon}
      </Button>
      <div
        aria-hidden
        className={cn(
          "absolute z-50 mt-2 min-w-[220px] rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md",
          "data-[airp-open=true]:fade-in-0 data-[airp-open=true]:zoom-in-95 data-[airp-open=true]:animate-in",
          "data-[airp-open=false]:fade-out-0 data-[airp-open=false]:zoom-out-95 data-[airp-open=false]:animate-out",
          panelClassName
        )}
        data-airp-popover-panel
        data-airp-open="false"
        hidden
        id={panelId}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

