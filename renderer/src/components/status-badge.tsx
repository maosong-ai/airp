import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { I18nContext } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function statusToVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "pass":
    case "done":
    case "positive":
      return "success";
    case "fail":
    case "blocked":
    case "critical":
    case "high":
      return "danger";
    case "partial":
    case "warning":
    case "in_progress":
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge className={cn(className)} variant={statusToVariant(status)}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label ?? status}
    </Badge>
  );
}

export function formatCellValue(
  value: unknown,
  cellKind: string | undefined,
  ctx: I18nContext
): ReactNode {
  if (value === null || value === undefined) {
    return "—";
  }
  if (cellKind === "status" && typeof value === "string") {
    return <StatusBadge status={value} />;
  }
  if (cellKind === "code") {
    return <code className="font-mono text-xs">{String(value)}</code>;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return ctx.t(value as import("@/lib/airp-schema").LocalizedString);
  }
  return String(value);
}
