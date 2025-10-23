import { type AIGatewayModel } from "@quests/ai-gateway/client";
import { CircleOff } from "lucide-react";

import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ModelTags({ model }: { model: AIGatewayModel.Type }) {
  const tags = [];

  if (model.tags.includes("legacy")) {
    tags.push(
      <Badge className="text-xs px-1 py-0" key="legacy" variant="outline">
        legacy
      </Badge>,
    );
  }

  if (model.tags.includes("new")) {
    tags.push(
      <Badge className="text-xs px-1 py-0" key="new" variant="outline">
        new
      </Badge>,
    );
  }

  if (model.tags.includes("exacto")) {
    tags.push(
      <Tooltip key="exacto">
        <TooltipTrigger asChild>
          <Badge className="text-xs px-1 py-0" variant="outline">
            exacto
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>OpenRouter variant with higher tool-calling accuracy</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  if (!model.features.includes("tools")) {
    tags.push(
      <Badge className="text-xs px-1 py-0" key="no-tools" variant="destructive">
        <CircleOff className="mr-0.5 size-3" />
        tools
      </Badge>,
    );
  }

  return <>{tags}</>;
}
