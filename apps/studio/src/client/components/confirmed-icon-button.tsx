import { Check } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ConfirmedIconButton({
  className = "h-6 w-6 p-0",
  icon: Icon,
  onClick,
  size = "sm",
  successTooltip = "Done!",
  tooltip,
  variant = "ghost",
  ...buttonProps
}: ComponentProps<typeof Button> & {
  icon: LucideIcon;
  successTooltip?: string;
  tooltip: string;
}) {
  const [actionState, setActionState] = useState<"idle" | "success">("idle");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setActionState("success");
    setTimeout(() => {
      setActionState("idle");
    }, 1000);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={className}
          onClick={handleClick}
          size={size}
          variant={variant}
          {...buttonProps}
        >
          {actionState === "success" ? (
            <Check className="size-3.5" />
          ) : (
            <Icon className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{actionState === "success" ? successTooltip : tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
