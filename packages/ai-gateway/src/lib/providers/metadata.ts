import { addRef, type AIProviderType } from "@quests/shared";

import {
  type ProviderMetadata,
  type ProviderMetadataInput,
  ProviderMetadataSchema,
} from "../../schemas/provider-metadata";

const PROVIDER_METADATA: Record<AIProviderType, ProviderMetadataInput> = {
  anthropic: {
    api: {
      defaultBaseURL: "https://api.anthropic.com",
      keyFormat: "sk-ant-",
      keyURL: addRef("https://console.anthropic.com/settings/keys"),
    },
    description: "Claude Haiku, Sonnet, and Opus",
    name: "Anthropic",
    type: "anthropic",
    url: addRef("https://anthropic.com"),
  },
  anyscale: {
    api: {
      defaultBaseURL: "https://api.endpoints.anyscale.com/v1",
      keyURL: addRef("https://docs.anyscale.com/auth/api-keys"),
    },
    description:
      "Scalable AI infrastructure built on Ray for distributed computing",
    name: "Anyscale",
    type: "anyscale",
    url: addRef("https://www.anyscale.com"),
  },
  cerebras: {
    api: {
      defaultBaseURL: "https://api.cerebras.ai/v1",
      keyFormat: "csk-",
      keyURL: addRef("https://cloud.cerebras.ai"),
    },
    description:
      "Ultra-fast inference with popular open-source models like Llama and Qwen",
    name: "Cerebras",
    type: "cerebras",
    url: addRef("https://www.cerebras.ai"),
  },
  deepinfra: {
    api: {
      defaultBaseURL: "https://api.deepinfra.com/v1",
      keyURL: addRef("https://deepinfra.com/docs/deep_infra_api"),
    },
    description:
      "Cloud platform for running large AI models with flexible pricing",
    name: "DeepInfra",
    type: "deepinfra",
    url: addRef("https://deepinfra.com"),
  },
  deepseek: {
    api: {
      defaultBaseURL: "https://api.deepseek.com/v1",
      keyFormat: "sk-",
      keyURL: addRef("https://platform.deepseek.com/api_keys"),
    },
    description:
      "Advanced reasoning models with strong coding and mathematical capabilities",
    name: "DeepSeek",
    type: "deepseek",
    url: addRef("https://deepseek.com"),
  },
  fireworks: {
    api: {
      defaultBaseURL: "https://api.fireworks.ai/inference/v1",
      keyFormat: "fw_",
      keyURL: addRef("https://docs.fireworks.ai/getting-started/quickstart"),
    },
    description:
      "High-speed multimodal AI inference with advanced FireAttention technology",
    name: "Fireworks AI",
    // Disabled until fixed
    // tags: ["imageGeneration"],
    type: "fireworks",
    url: addRef("https://fireworks.ai"),
  },
  google: {
    api: {
      defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
      keyFormat: "AI",
      keyURL: addRef("https://aistudio.google.com/api-keys"),
    },
    description: "Google AI Studio with Gemini and other models",
    name: "Google",
    tags: ["imageGeneration"],
    type: "google",
    url: addRef("https://ai.google.dev/gemini-api/docs"),
  },
  groq: {
    api: {
      defaultBaseURL: "https://api.groq.com/openai/v1",
      keyFormat: "gsk-",
      keyURL: addRef("https://console.groq.com/keys"),
    },
    description:
      "Ultra-fast AI inference powered by custom LPU hardware designed for speed",
    name: "Groq",
    type: "groq",
    url: addRef("https://groq.com"),
  },
  huggingface: {
    api: {
      defaultBaseURL: "https://router.huggingface.co/v1",
      keyURL: addRef("https://huggingface.co/settings/tokens"),
    },
    description:
      "Community-driven platform with thousands of open-source AI models",
    name: "Hugging Face Inference",
    type: "huggingface",
    url: addRef("https://huggingface.co"),
  },
  hyperbolic: {
    api: {
      defaultBaseURL: "https://api.hyperbolic.xyz/v1",
      keyURL: addRef("https://docs.hyperbolic.xyz/docs/getting-started"),
    },
    description: "Budget-friendly GPU access for running various AI models",
    name: "Hyperbolic",
    type: "hyperbolic",
    url: addRef("https://hyperbolic.ai"),
  },
  jan: {
    api: {
      defaultBaseURL: "http://localhost:8080/v1",
    },
    description:
      "Open-source offline ChatGPT alternative with 70+ models and customizable inference",
    name: "Jan.ai",
    requiresAPIKey: false,
    type: "jan",
    url: addRef("https://jan.ai"),
  },
  lmstudio: {
    api: {
      defaultBaseURL: "http://localhost:1234/v1",
    },
    description:
      "Polished GUI for managing and running local LLMs with built-in chat interface",
    name: "LM Studio",
    requiresAPIKey: false,
    type: "lmstudio",
    url: addRef("https://lmstudio.ai"),
  },
  localai: {
    api: {
      defaultBaseURL: "http://localhost:8080/v1",
    },
    description:
      "Versatile drop-in replacement for OpenAI API supporting multiple architectures",
    name: "LocalAI",
    requiresAPIKey: false,
    type: "localai",
    url: addRef("https://localai.io"),
  },
  minimax: {
    api: {
      defaultBaseURL: "https://api.minimax.io/v1",
      keyFormat: "sk-api-",
      keyURL: addRef(
        "https://platform.minimax.io/user-center/basic-information/interface-key",
      ),
    },
    description: "Minimax AI models",
    name: "Minimax",
    type: "minimax",
    url: addRef("https://minimax.com"),
  },
  mistral: {
    api: {
      defaultBaseURL: "https://api.mistral.ai/v1",
      keyURL: addRef("https://docs.mistral.ai/getting-started/quickstart/"),
    },
    description:
      "European AI provider with models optimized for coding and general tasks",
    name: "Mistral AI",
    type: "mistral",
    url: addRef("https://mistral.ai"),
  },
  novita: {
    api: {
      defaultBaseURL: "https://api.novita.ai/v1",
      keyURL: addRef("https://novita.ai/docs/get-started/quickstart.html"),
    },
    description:
      "Affordable serverless GPU platform with access to 200+ AI models",
    name: "Novita AI",
    type: "novita",
    url: addRef("https://novita.ai"),
  },
  ollama: {
    api: {
      defaultBaseURL: "http://localhost:11434",
    },
    description: "Run local models on your own machine",
    name: "Ollama",
    requiresAPIKey: false,
    type: "ollama",
    url: addRef("https://docs.ollama.com"),
  },
  openai: {
    api: {
      defaultBaseURL: "https://api.openai.com",
      keyFormat: "sk-",
      keyURL: addRef("https://platform.openai.com/account/api-keys"),
    },
    description: "GPT-5 and other OpenAI models",
    name: "OpenAI",
    tags: ["imageGeneration"],
    type: "openai",
    url: addRef("https://openai.com"),
  },
  "openai-compatible": {
    api: {
      defaultBaseURL: "",
    },
    description: "Add your own custom OpenAI-compatible provider",
    name: "Custom OpenAI-Compatible Provider",
    type: "openai-compatible",
    url: "",
  },
  openrouter: {
    api: {
      defaultBaseURL: "https://openrouter.ai/api",
      keyFormat: "sk-or-",
      keyURL: addRef("https://openrouter.ai/settings/keys"),
    },
    description: "Access an extensive catalog of models across providers",
    name: "OpenRouter",
    tags: ["recommended", "imageGeneration"],
    type: "openrouter",
    url: "https://openrouter.ai",
  },
  perplexity: {
    api: {
      defaultBaseURL: "https://api.perplexity.ai",
      keyURL: addRef("https://docs.perplexity.ai/getting-started/quickstart"),
    },
    description:
      "AI models specialized in search and real-time knowledge retrieval",
    name: "Perplexity AI",
    type: "perplexity",
    url: addRef("https://www.perplexity.ai"),
  },
  quests: {
    api: {
      defaultBaseURL: "https://api.quests.dev/gateway/openrouter",
    },
    canAddManually: false,
    description: "Quests AI Gateway",
    name: "Quests",
    tags: ["imageGeneration"],
    type: "quests",
    url: addRef("https://quests.dev"),
  },
  together: {
    api: {
      defaultBaseURL: "https://api.together.xyz/v1",
      keyURL: addRef("https://docs.together.ai/docs/quickstart"),
    },
    description:
      "Access to 200+ open-source AI models with optimized performance at scale",
    name: "Together AI",
    type: "together",
    url: addRef("https://www.together.ai"),
  },
  vercel: {
    api: {
      defaultBaseURL: "https://ai-gateway.vercel.sh",
      keyFormat: "vck_",
      keyURL: `https://vercel.com/d?to=${encodeURIComponent(`/[team]/~/ai/api-keys`)}&title=${encodeURIComponent("Get an API Key")}`,
    },
    description: "Access hundreds of models across many providers",
    name: "Vercel AI Gateway",
    tags: ["imageGeneration"],
    type: "vercel",
    url: addRef("https://vercel.com/ai-gateway"),
  },
  "x-ai": {
    api: {
      defaultBaseURL: "https://api.x.ai/v1",
      keyURL: addRef("https://console.x.ai/team/default/api-keys"),
    },
    description: "Grok models from xAI",
    name: "xAI Grok",
    tags: ["imageGeneration"],
    type: "x-ai",
    url: addRef("https://x.ai"),
  },
  "z-ai": {
    api: {
      defaultBaseURL: "https://api.z.ai/api/coding/paas/v4",
      keyURL: addRef("https://docs.z.ai"),
    },
    description: "GLM Coding Plan with GLM-4.5 and GLM-4.6 models",
    name: "Z.ai GLM Coding Plan",
    type: "z-ai",
    url: addRef("https://z.ai"),
  },
};

const PARSED_PROVIDER_METADATA = Object.values(PROVIDER_METADATA).map(
  (metadata) => ProviderMetadataSchema.parse(metadata),
);

export function getAllProviderMetadata(): ProviderMetadata[] {
  return PARSED_PROVIDER_METADATA;
}

export function getProviderMetadata(providerType: AIProviderType) {
  return PROVIDER_METADATA[providerType];
}
