import { type AIGatewayModel } from "@quests/ai-gateway/client";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AudioLines,
  Hourglass,
  Image,
  type LucideIcon,
  Sprout,
  Target,
  TextCursorInput,
  Video,
  Wrench,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const iconVariants = cva("size-4", {
  defaultVariants: {
    color: "primary",
  },
  variants: {
    color: {
      destructive: "text-destructive",
      primary: "text-primary",
      warning: "text-warning-foreground",
    },
  },
});

interface BadgeConfig {
  color?: VariantProps<typeof iconVariants>["color"];
  icon: LucideIcon;
  key: string;
  shouldShow: (model: AIGatewayModel.Type) => boolean;
  tooltip: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    icon: Sprout,
    key: "new",
    shouldShow: (model) => model.tags.includes("new"),
    tooltip: "A recently released or added model",
  },
  {
    icon: Target,
    key: "exacto",
    shouldShow: (model) => model.tags.includes("exacto"),
    tooltip: "OpenRouter Exacto variant with higher tool-calling accuracy",
  },
  {
    icon: Image,
    key: "image",
    shouldShow: (model) => model.features.includes("inputImage"),
    tooltip: "This model can view images",
  },
  {
    icon: Video,
    key: "video",
    shouldShow: (model) => model.features.includes("inputVideo"),
    tooltip: "This model can view videos",
  },
  {
    icon: AudioLines,
    key: "audio",
    shouldShow: (model) => model.features.includes("inputAudio"),
    tooltip: "This model can listen to audio",
  },
  {
    color: "warning",
    icon: Hourglass,
    key: "legacy",
    shouldShow: (model) => model.tags.includes("legacy"),
    tooltip: "This model is older and has been superseded by newer models",
  },
  {
    color: "destructive",
    icon: TextCursorInput,
    key: "no-text",
    shouldShow: (model) => !model.features.includes("inputText"),
    tooltip: "This model cannot process text prompts",
  },
  {
    color: "destructive",
    icon: Wrench,
    key: "no-tools",
    shouldShow: (model) => !model.features.includes("tools"),
    tooltip: "This model cannot use tools to perform actions",
  },
];

export function ModelBadges({ model }: { model: AIGatewayModel.Type }) {
  return (
    <div className="flex items-center gap-1">
      {BADGE_CONFIGS.filter((config) => config.shouldShow(model)).map(
        (config) => (
          <Badge config={config} key={config.key} />
        ),
      )}
    </div>
  );
}

function Badge({ config }: { config: BadgeConfig }) {
  const Icon = config.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Icon className={iconVariants({ color: config.color })} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
