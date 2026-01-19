import { cn } from "../../lib/utils";

export function ToolCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolCardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-2 py-1.5 text-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}
