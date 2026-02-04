import { cn } from "@/client/lib/utils";
import { ChevronUp } from "lucide-react";
import { type ReactNode } from "react";

export function ToolPartListItemCompact({
  children,
  icon,
  isExpanded,
  label,
  labelClassName,
  reasoning,
  value,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  isExpanded?: boolean;
  label?: ReactNode;
  labelClassName?: string;
  reasoning?: string;
  value?: ReactNode;
}) {
  if (children) {
    return (
      <div className="flex w-full min-w-0 items-center gap-2 text-xs/tight">
        {children}
        {isExpanded && (
          <span className="ml-auto flex shrink-0 items-center text-accent-foreground/60">
            <ChevronUp className="size-3" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden text-xs/tight">
      {icon && (
        <span className="flex shrink-0 items-center text-accent-foreground/80">
          {icon}
        </span>
      )}
      <span
        className={cn(
          "shrink-0 font-medium text-foreground/80",
          labelClassName,
        )}
      >
        {label}
      </span>
      {value && (
        <span className="min-w-0 shrink-0 truncate text-foreground/60">
          {value}
        </span>
      )}
      <span className="ml-auto flex min-w-0 items-center gap-2">
        {reasoning && (
          <span className="min-w-0 truncate text-muted-foreground/60">
            {reasoning}
          </span>
        )}
        {isExpanded && (
          <span className="flex shrink-0 items-center text-accent-foreground/60">
            <ChevronUp className="size-3" />
          </span>
        )}
      </span>
    </div>
  );
}
