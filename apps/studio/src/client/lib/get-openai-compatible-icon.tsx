import type { ComponentType } from "react";

import { OPENAI_COMPATIBLE_PROVIDERS } from "@/client/data/openai-compatible-providers";
import { GrNodes } from "react-icons/gr";

export function getOpenAICompatibleIcon(
  providerName: string,
): ComponentType<{ className?: string }> {
  const provider = OPENAI_COMPATIBLE_PROVIDERS.find(
    (p) => p.name === providerName,
  );
  return provider?.icon ?? GrNodes;
}
