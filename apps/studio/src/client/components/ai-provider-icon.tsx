import { type AIGatewayProvider } from "@quests/ai-gateway";

import {
  Anthropic,
  Google,
  Ollama,
  OpenAI,
  OpenRouter,
  Vercel,
} from "./service-icons";

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
      return <Anthropic className={className} />;
    }
    case "google": {
      return <Google className={className} />;
    }
    case "ollama": {
      return <Ollama className={className} />;
    }
    case "openai": {
      return <OpenAI className={className} />;
    }
    case "openrouter": {
      return <OpenRouter className={className} />;
    }
    case "vercel": {
      return <Vercel className={className} />;
    }
    default: {
      const exhaustiveCheck: never = type;
      // eslint-disable-next-line no-console
      console.warn(`Unknown AI provider type: ${exhaustiveCheck as string}`);
      return null;
    }
  }
}
