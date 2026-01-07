import type { ComponentType } from "react";

import { type AIGatewayModel } from "@quests/ai-gateway/client";
import {
  AudioLines,
  Hourglass,
  Image,
  type LucideIcon,
  Target,
  TextCursorInput,
  Video,
  Wrench,
} from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function Sparkle2Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="1em"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="m17.503 14.751l.306.777c.3.763.904 1.366 1.666 1.667l.777.306l-.777.307c-.762.3-1.365.904-1.666 1.666l-.306.777l-.307-.777a2.96 2.96 0 0 0-1.666-1.666l-.777-.307l.777-.306a2.96 2.96 0 0 0 1.666-1.667z"
          fill="currentColor"
        />
        <path
          d="M9.61 3.976c.08-.296.5-.296.58 0l.154.572a6.96 6.96 0 0 0 4.908 4.908l.572.154c.296.08.296.5 0 .58l-.572.154a6.96 6.96 0 0 0-4.908 4.908l-.154.572c-.08.296-.5.296-.58 0l-.154-.572a6.96 6.96 0 0 0-4.908-4.908l-.572-.154c-.296-.08-.296-.5 0-.58l.572-.154a6.96 6.96 0 0 0 4.908-4.908z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

const iconVariants = tv({
  base: "size-4",
  defaultVariants: {
    color: "primary",
  },
  variants: {
    color: {
      brand: "text-brand",
      destructive: "text-destructive",
      primary: "text-primary",
      warning: "text-warning-foreground",
    },
  },
});

interface BadgeConfig {
  color?: VariantProps<typeof iconVariants>["color"];
  icon: ComponentType<{ className?: string }> | LucideIcon;
  key: string;
  shouldShow: (model: AIGatewayModel.Type) => boolean;
  tooltip: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    color: "brand",
    icon: Sparkle2Icon,
    key: "new",
    shouldShow: (model) => model.tags.includes("new"),
    tooltip: "A recently released model",
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
