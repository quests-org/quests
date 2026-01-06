import { type AIGatewayModel } from "@quests/ai-gateway/client";

import { AIProviderIcon } from "./ai-provider-icon";

interface ModelChipProps {
  aiGatewayModel?: AIGatewayModel.Type;
  className?: string;
  modelId?: string;
}

export function ModelChip({
  aiGatewayModel,
  className = "",
  modelId,
}: ModelChipProps) {
  const displayName = aiGatewayModel?.name ?? modelId;
  const provider = aiGatewayModel?.params.provider;

  if (!displayName) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {provider && (
        <AIProviderIcon
          className="size-3 shrink-0 opacity-70"
          type={provider}
        />
      )}
      <span className="truncate text-xs text-muted-foreground">
        {displayName}
      </span>
    </div>
  );
}
