import { cn } from "@/client/lib/utils";
import { ChevronUp } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

import { Button } from "./ui/button";

export function CollapsiblePartHeader({
  children,
  icon,
  isExpanded,
  label,
  labelClassName,
  value,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  isExpanded?: boolean;
  label?: ReactNode;
  labelClassName?: string;
  value?: ReactNode;
}) {
  if (children) {
    return (
      <div className="flex w-full min-w-0 items-center gap-2 text-xs leading-tight">
        {children}
        {isExpanded && (
          <span className="ml-auto shrink-0 text-accent-foreground/60">
            <ChevronUp className="size-3" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 text-xs leading-tight">
      {icon && (
        <span className="shrink-0 text-accent-foreground/80">{icon}</span>
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
        <span className="min-w-0 truncate text-foreground/60">{value}</span>
      )}
      {isExpanded && (
        <span className="ml-auto shrink-0 text-accent-foreground/60">
          <ChevronUp className="size-3" />
        </span>
      )}
    </div>
  );
}

export function CollapsiblePartMainContent({
  children,
  className,
  contentClassName,
  contentRef,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className={cn("mt-2 text-xs", className)}>
      <div
        className={cn(
          "max-h-64 overflow-y-auto rounded-md border border-l-4 bg-muted/30 p-2",
          contentClassName,
        )}
        ref={contentRef}
      >
        {children}
      </div>
    </div>
  );
}

export const CollapsiblePartTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  return (
    <Button
      className="h-6 w-full justify-start rounded-sm px-1 py-0 hover:bg-accent/30 disabled:opacity-100"
      ref={ref}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
});

CollapsiblePartTrigger.displayName = "CollapsiblePartTrigger";
