import { EyeIcon } from "lucide-react";

import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function DeveloperModeBadge() {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Badge className="px-1 py-0 text-[10px] uppercase" variant="warning">
          <EyeIcon className="size-2.5" />
          Dev mode
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        This element is only visible in developer mode
      </TooltipContent>
    </Tooltip>
  );
}
