import { cn } from "@/client/lib/utils";
import { type ComponentProps } from "react";

export interface ProgressProps extends ComponentProps<"div"> {
  max?: number;
  value?: number;
}

export function Progress({
  className,
  max = 100,
  value = 0,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
