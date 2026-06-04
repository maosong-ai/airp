import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import type { ReactNode } from "react";

const HOVER_MENU_OPEN_DELAY_MS = 0;
const HOVER_MENU_CLOSE_DELAY_MS = 200;

export type ToolbarHoverMenuProps = {
  /** Accessible name for the icon trigger. */
  ariaLabel: string;
  /** Optional native tooltip (e.g. current skin or locale). */
  title?: string;
  /** Icon-only trigger; omit when `trigger` is set. */
  icon?: ReactNode;
  /** Custom trigger node (e.g. export button with label). */
  trigger?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: "start" | "end";
  side?: "top" | "bottom";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ToolbarHoverMenu({
  ariaLabel,
  title,
  icon,
  trigger,
  children,
  className,
  contentClassName,
  align = "end",
  side = "bottom",
  open,
  onOpenChange,
}: ToolbarHoverMenuProps) {
  return (
    <HoverCard.Root
      closeDelay={HOVER_MENU_CLOSE_DELAY_MS}
      onOpenChange={onOpenChange}
      open={open}
      openDelay={HOVER_MENU_OPEN_DELAY_MS}
    >
      {trigger ? (
        <HoverCard.Trigger asChild>{trigger}</HoverCard.Trigger>
      ) : (
        <HoverCard.Trigger asChild>
          <Button
            aria-label={ariaLabel}
            className={cn("size-8 shrink-0 text-muted-foreground", className)}
            title={title}
            size="icon"
            type="button"
            variant="ghost"
          >
            {icon}
          </Button>
        </HoverCard.Trigger>
      )}
      <HoverCard.Portal>
        <HoverCard.Content
          align={align}
          className={cn(
            "z-50 min-w-[200px] rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            contentClassName
          )}
          side={side}
          sideOffset={6}
        >
          {children}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

export function ToolbarMenuSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
        {title}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function ToolbarMenuItem({
  active,
  onClick,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
        active && "bg-muted font-medium text-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
