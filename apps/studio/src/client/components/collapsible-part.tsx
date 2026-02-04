import { cn } from "@/client/lib/utils";
import { type ReactNode } from "react";

import { Button } from "./ui/button";

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

export function CollapsiblePartTrigger({
  children,
  ref,
  ...props
}: {
  children: ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}) {
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
}
