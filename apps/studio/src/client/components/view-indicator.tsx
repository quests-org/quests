import { ChevronRight } from "lucide-react";

interface ViewIndicatorProps {
  isSelected: boolean;
}

export function ViewIndicator({ isSelected }: ViewIndicatorProps) {
  return (
    <div className="shrink-0">
      {isSelected ? (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          Viewing
        </div>
      ) : (
        <div className="group flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <span className="font-medium">View</span>
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
}
