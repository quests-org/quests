import { type AIGatewayModel } from "@quests/ai-gateway/client";
import { cva } from "class-variance-authority";
import {
  Hourglass,
  Sprout,
  Target,
  TextCursorInput,
  Wrench,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const iconVariants = cva("size-4 text-primary", {
  variants: {
    color: {
      destructive: "text-destructive",
      primary: "text-primary",
      warning: "text-warning-foreground",
    },
  },
});

export function ModelTags({ model }: { model: AIGatewayModel.Type }) {
  const tags = [];

  if (model.tags.includes("legacy")) {
    tags.push(
      <Tooltip key="legacy">
        <TooltipTrigger asChild>
          <div>
            <Hourglass className={iconVariants({ color: "warning" })} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This model is older and has been superseded by newer models</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  if (model.tags.includes("new")) {
    tags.push(
      <Tooltip key="new">
        <TooltipTrigger asChild>
          <div>
            <Sprout className={iconVariants()} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>A recently released or added model</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  if (model.tags.includes("exacto")) {
    tags.push(
      <Tooltip key="exacto">
        <TooltipTrigger asChild>
          <div>
            <Target className={iconVariants()} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>OpenRouter Exacto variant with higher tool-calling accuracy</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  if (!model.features.includes("inputText")) {
    tags.push(
      <Tooltip key="no-text">
        <TooltipTrigger asChild>
          <div>
            <TextCursorInput
              className={iconVariants({ color: "destructive" })}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This model cannot process text prompts</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  if (!model.features.includes("tools")) {
    tags.push(
      <Tooltip key="no-tools">
        <TooltipTrigger asChild>
          <div>
            <Wrench className={iconVariants({ color: "destructive" })} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This model cannot use tools to perform actions</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  return <div className="flex items-center gap-1 flex-wrap">{tags}</div>;
}
