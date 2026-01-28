import { type AIGatewayProviderConfig } from "../schemas/provider-config";

interface AISDKProviderInfo {
  envVars: {
    apiKey: string;
    baseURL: string;
  };
  exportName: string;
  package: BundledProviderPackage;
}

type BundledProviderPackage =
  | "@ai-sdk/anthropic"
  | "@ai-sdk/cerebras"
  | "@ai-sdk/deepinfra"
  | "@ai-sdk/deepseek"
  | "@ai-sdk/fireworks"
  | "@ai-sdk/gateway"
  | "@ai-sdk/google"
  | "@ai-sdk/groq"
  | "@ai-sdk/mistral"
  | "@ai-sdk/openai"
  | "@ai-sdk/openai-compatible"
  | "@ai-sdk/perplexity"
  | "@ai-sdk/togetherai"
  | "@ai-sdk/xai"
  | "@openrouter/ai-sdk-provider"
  | "ai-sdk-ollama";

const PROVIDER_TYPE_TO_AI_SDK_INFO: Partial<
  Record<AIGatewayProviderConfig.Type["type"], AISDKProviderInfo>
> = {
  anthropic: {
    envVars: {
      apiKey: "ANTHROPIC_API_KEY",
      baseURL: "ANTHROPIC_BASE_URL",
    },
    exportName: "createAnthropic",
    package: "@ai-sdk/anthropic",
  },
  cerebras: {
    envVars: {
      apiKey: "CEREBRAS_API_KEY",
      baseURL: "CEREBRAS_BASE_URL",
    },
    exportName: "createCerebras",
    package: "@ai-sdk/cerebras",
  },
  deepinfra: {
    envVars: {
      apiKey: "DEEPINFRA_API_KEY",
      baseURL: "DEEPINFRA_BASE_URL",
    },
    exportName: "createDeepInfra",
    package: "@ai-sdk/deepinfra",
  },
  deepseek: {
    envVars: {
      apiKey: "DEEPSEEK_API_KEY",
      baseURL: "DEEPSEEK_BASE_URL",
    },
    exportName: "createDeepSeek",
    package: "@ai-sdk/deepseek",
  },
  fireworks: {
    envVars: {
      apiKey: "FIREWORKS_API_KEY",
      baseURL: "FIREWORKS_BASE_URL",
    },
    exportName: "createFireworks",
    package: "@ai-sdk/fireworks",
  },
  google: {
    envVars: {
      apiKey: "GOOGLE_GENERATIVE_AI_API_KEY",
      baseURL: "GOOGLE_GENERATIVE_AI_BASE_URL",
    },
    exportName: "createGoogleGenerativeAI",
    package: "@ai-sdk/google",
  },
  groq: {
    envVars: {
      apiKey: "GROQ_API_KEY",
      baseURL: "GROQ_BASE_URL",
    },
    exportName: "createGroq",
    package: "@ai-sdk/groq",
  },
  mistral: {
    envVars: {
      apiKey: "MISTRAL_API_KEY",
      baseURL: "MISTRAL_BASE_URL",
    },
    exportName: "createMistral",
    package: "@ai-sdk/mistral",
  },
  ollama: {
    envVars: {
      apiKey: "OLLAMA_API_KEY",
      baseURL: "OLLAMA_BASE_URL",
    },
    exportName: "createOllama",
    package: "ai-sdk-ollama",
  },
  openai: {
    envVars: {
      apiKey: "OPENAI_API_KEY",
      baseURL: "OPENAI_BASE_URL",
    },
    exportName: "createOpenAI",
    package: "@ai-sdk/openai",
  },
  openrouter: {
    envVars: {
      apiKey: "OPENROUTER_API_KEY",
      baseURL: "OPENROUTER_BASE_URL",
    },
    exportName: "createOpenRouter",
    package: "@openrouter/ai-sdk-provider",
  },
  perplexity: {
    envVars: {
      apiKey: "PERPLEXITY_API_KEY",
      baseURL: "PERPLEXITY_BASE_URL",
    },
    exportName: "createPerplexity",
    package: "@ai-sdk/perplexity",
  },
  quests: {
    envVars: {
      apiKey: "QUESTS_AI_API_KEY",
      baseURL: "QUESTS_AI_BASE_URL",
    },
    exportName: "createOpenRouter",
    package: "@openrouter/ai-sdk-provider",
  },
  together: {
    envVars: {
      apiKey: "TOGETHER_AI_API_KEY",
      baseURL: "TOGETHER_AI_BASE_URL",
    },
    exportName: "createTogetherAI",
    package: "@ai-sdk/togetherai",
  },
  vercel: {
    envVars: {
      apiKey: "AI_GATEWAY_API_KEY",
      baseURL: "AI_GATEWAY_BASE_URL",
    },
    exportName: "createGateway",
    package: "@ai-sdk/gateway",
  },
  "x-ai": {
    envVars: {
      apiKey: "XAI_API_KEY",
      baseURL: "XAI_BASE_URL",
    },
    exportName: "createXai",
    package: "@ai-sdk/xai",
  },
};

export function getAISDKProviderInfo(
  providerType: AIGatewayProviderConfig.Type["type"],
): AISDKProviderInfo {
  return (
    PROVIDER_TYPE_TO_AI_SDK_INFO[providerType] ?? {
      envVars: {
        apiKey: "OPENAI_API_KEY",
        baseURL: "OPENAI_BASE_URL",
      },
      exportName: "createOpenAICompatible",
      package: "@ai-sdk/openai-compatible",
    }
  );
}

export function getPackageForProviderType(
  providerType: AIGatewayProviderConfig.Type["type"],
): BundledProviderPackage {
  return getAISDKProviderInfo(providerType).package;
}
