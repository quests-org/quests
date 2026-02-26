import { ChevronRight } from "lucide-react";

export function ViewIndicator({ isViewing }: { isViewing: boolean }) {
  return (
    <div className="shrink-0">
      {isViewing ? (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          Viewing
        </div>
      ) : (
        <div className="group flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <span className="font-medium">View</span>
          <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
}
