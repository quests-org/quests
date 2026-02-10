import type { ReactNode } from "react";

import { cn } from "@/client/lib/utils";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function PreviewListItem({
  icon,
  isSelected = false,
  label,
  onClick,
  rightElement,
  tooltipContent,
}: {
  icon: ReactNode;
  isSelected?: boolean;
  label: string;
  onClick: () => void;
  rightElement?: ReactNode;
  tooltipContent?: string;
}) {
  const button = (
    <Button
      className={cn(
        "h-12 w-full justify-start gap-x-2 overflow-hidden",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      onClick={onClick}
      type="button"
      variant="outline-muted"
    >
      {icon}
      <span className="min-w-0 truncate text-left text-xs/tight">{label}</span>
      {rightElement && <div className="ml-auto shrink-0">{rightElement}</div>}
    </Button>
  );

  if (!tooltipContent) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        className="max-w-[min(500px,90vw)] wrap-break-word"
        collisionPadding={10}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
