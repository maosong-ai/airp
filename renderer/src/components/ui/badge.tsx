import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        success: "border-transparent bg-report-green-dim text-report-green",
        warning: "border-transparent bg-report-amber-dim text-report-amber",
        danger: "border-transparent bg-report-red-dim text-report-red",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
