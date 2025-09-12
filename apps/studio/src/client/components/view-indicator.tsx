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
        <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          <span className="font-medium">View</span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
}
