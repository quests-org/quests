import { type AIGatewayProvider } from "@quests/ai-gateway";
import { GrNodes } from "react-icons/gr";
import {
  SiAnthropic,
  SiGooglegemini,
  SiOllama,
  SiOpenai,
  SiVercel,
} from "react-icons/si";

import { OpenRouter } from "./service-icons";

interface AIProviderIconProps {
  className?: string;
  type: AIGatewayProvider.Type["type"];
}

export function AIProviderIcon({
  className = "size-5",
  type,
}: AIProviderIconProps) {
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
