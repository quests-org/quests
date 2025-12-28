import { type ToolName } from "@quests/workspace/client";
import { HelpCircle } from "lucide-react";

import { TOOL_ICONS } from "../lib/tool-display";

export function ToolIcon({
  className,
  toolName,
}: {
  className?: string;
  toolName: ToolName;
}) {
  const Icon = TOOL_ICONS[toolName] ?? HelpCircle;
  return <Icon className={className} />;
}
