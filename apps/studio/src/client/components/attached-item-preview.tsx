import type { ReactNode } from "react";

import { X } from "lucide-react";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function AttachedItemPreview({
  icon,
  label,
  onClick,
  onRemove,
  tooltip,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  tooltip?: ReactNode;
}) {
  const button = (
    <Button
      className="size-full min-w-0 justify-start gap-x-2 overflow-hidden"
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {icon}
      <span className="min-w-0 truncate text-xs">{label}</span>
    </Button>
  );

  return (
    <div className="group relative h-12 max-w-48 min-w-0">
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            className="max-w-[min(500px,90vw)] wrap-break-word"
            collisionPadding={10}
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {onRemove && (
        <button
          className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-muted"
          onClick={onRemove}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
