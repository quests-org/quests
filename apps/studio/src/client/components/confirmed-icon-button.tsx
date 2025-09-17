import { Check } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ConfirmedIconButtonProps {
  className?: string;
  icon: LucideIcon;
  onClick: () => Promise<void> | void;
  size?: "icon" | "sm";
  successTooltip?: string;
  tooltip: string;
  variant?: "ghost" | "outline" | "secondary";
}

export function ConfirmedIconButton({
  className = "h-6 w-6 p-0",
  icon: Icon,
  onClick,
  size = "sm",
  successTooltip = "Done!",
  tooltip,
  variant = "ghost",
}: ConfirmedIconButtonProps) {
  const [actionState, setActionState] = useState<"idle" | "success">("idle");

  const handleClick = async () => {
    await onClick();
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
        >
          {actionState === "success" ? (
            <Check className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{actionState === "success" ? successTooltip : tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
