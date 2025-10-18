import type { ComponentType } from "react";

import { OPENAI_COMPATIBLE_PROVIDERS } from "@/client/data/openai-compatible-providers";
import { type AIProviderConfigSubType } from "@quests/shared";
import { GrNodes } from "react-icons/gr";

export function getOpenAICompatibleIcon(
  subType: AIProviderConfigSubType,
): ComponentType<{ className?: string }> {
  const provider = OPENAI_COMPATIBLE_PROVIDERS.find(
    (p) => p.subType === subType,
  );
  return provider?.icon ?? GrNodes;
}
