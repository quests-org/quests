import { getOpenAICompatibleIcon } from "@/client/lib/get-openai-compatible-icon";
import {
  type AIProviderConfigSubType,
  type AIProviderType,
} from "@quests/shared";
import { GrNodes } from "react-icons/gr";
import {
  SiAnthropic,
  SiGooglegemini,
  SiOllama,
  SiOpenai,
  SiVercel,
} from "react-icons/si";

import { OpenRouter } from "./service-icons";

export function AIProviderIcon({
  className = "size-5",
  subType,
  type,
}: {
  className?: string;
  subType?: AIProviderConfigSubType;
  type: AIProviderType;
}) {
  if (type === "openai-compatible" && subType) {
    const CustomIcon = getOpenAICompatibleIcon(subType);
    return <CustomIcon className={className} />;
  }

  switch (type) {
    case "anthropic": {
      return <SiAnthropic className={className} />;
    }
    case "google": {
      return <SiGooglegemini className={className} />;
    }
    case "ollama": {
      return <SiOllama className={className} />;
    }
    case "openai": {
      return <SiOpenai className={className} />;
    }
    case "openai-compatible": {
      return <GrNodes className={className} />;
    }
    case "openrouter": {
      return <OpenRouter className={className} />;
    }
    case "vercel": {
      return <SiVercel className={className} />;
    }
    default: {
      const exhaustiveCheck: never = type;
      // eslint-disable-next-line no-console
      console.warn(`Unknown AI provider type: ${exhaustiveCheck as string}`);
      return null;
    }
  }
}
