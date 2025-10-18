import type { ComponentType } from "react";

import { Anyscale } from "@/client/components/icons/anyscale";
import { Cerebras } from "@/client/components/icons/cerebras";
import { DeepInfra } from "@/client/components/icons/deepinfra";
import { Fireworks } from "@/client/components/icons/fireworks";
import { Groq } from "@/client/components/icons/groq";
import { HuggingFace } from "@/client/components/icons/huggingface";
import { Hyperbolic } from "@/client/components/icons/hyperbolic";
import { Jan } from "@/client/components/icons/jan";
import { LMStudio } from "@/client/components/icons/lmstudio";
import { LocalAI } from "@/client/components/icons/localai";
import { Mistral } from "@/client/components/icons/mistral";
import { Novita } from "@/client/components/icons/novita";
import { Perplexity } from "@/client/components/icons/perplexity";
import { Together } from "@/client/components/icons/together";
import { XAI } from "@/client/components/icons/x-ai";
import { ZAI } from "@/client/components/icons/z-ai";
import { addRef, type AIProviderConfigSubType } from "@quests/shared";

export interface OpenAICompatibleProvider {
  api: {
    defaultBaseURL: string;
    keyFormat?: string;
    keyURL?: string;
  };
  description: string;
  icon: ComponentType<{ className?: string }>;
  name: string;
  requiresAPIKey?: boolean;
  subType: AIProviderConfigSubType;
  url: string;
}

export const OPENAI_COMPATIBLE_PROVIDERS: OpenAICompatibleProvider[] = [
  {
    api: {
      defaultBaseURL: "https://api.z.ai/api/coding/paas/v4",
      keyURL: addRef("https://docs.z.ai"),
    },
    description: "GLM Coding Plan with GLM-4.5 and GLM-4.6 models.",
    icon: ZAI,
    name: "Z.ai",
    subType: "z-ai",
    url: addRef("https://z.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.cerebras.ai/v1",
      keyURL: addRef("https://cloud.cerebras.ai"),
    },
    description:
      "Ultra-fast inference with popular open-source models like Llama and Qwen.",
    icon: Cerebras,
    name: "Cerebras",
    subType: "cerebras",
    url: addRef("https://www.cerebras.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.groq.com/openai/v1",
      keyURL: addRef("https://console.groq.com/keys"),
    },
    description:
      "Ultra-fast AI inference powered by custom LPU hardware designed for speed.",
    icon: Groq,
    name: "Groq",
    subType: "groq",
    url: addRef("https://groq.com"),
  },
  {
    api: {
      defaultBaseURL: "https://api.together.xyz/v1",
      keyURL: addRef("https://docs.together.ai/docs/quickstart"),
    },
    description:
      "Access to 200+ open-source AI models with optimized performance at scale.",
    icon: Together,
    name: "Together AI",
    subType: "together",
    url: addRef("https://www.together.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.fireworks.ai/inference/v1",
      keyURL: addRef("https://docs.fireworks.ai/getting-started/quickstart"),
    },
    description:
      "High-speed multi-modal AI inference with advanced FireAttention technology.",
    icon: Fireworks,
    name: "Fireworks AI",
    subType: "fireworks",
    url: addRef("https://fireworks.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.deepinfra.com/v1",
      keyURL: addRef("https://deepinfra.com/docs/deep_infra_api"),
    },
    description:
      "Cloud platform for running large AI models with flexible pricing.",
    icon: DeepInfra,
    name: "DeepInfra",
    subType: "deepinfra",
    url: addRef("https://deepinfra.com"),
  },
  {
    api: {
      defaultBaseURL: "https://api.novita.ai/v1",
      keyURL: addRef("https://novita.ai/docs/get-started/quickstart.html"),
    },
    description:
      "Affordable serverless GPU platform with access to 200+ AI models.",
    icon: Novita,
    name: "Novita AI",
    subType: "novita",
    url: addRef("https://novita.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api-inference.huggingface.co/v1",
      keyURL: addRef(
        "https://huggingface.co/docs/huggingface_hub/v0.13.2/en/guides/inference",
      ),
    },
    description:
      "Community-driven platform with thousands of open-source AI models.",
    icon: HuggingFace,
    name: "Hugging Face Inference",
    subType: "huggingface",
    url: addRef("https://huggingface.co"),
  },
  {
    api: {
      defaultBaseURL: "https://api.perplexity.ai/chat/completions",
      keyURL: addRef("https://docs.perplexity.ai/getting-started/quickstart"),
    },
    description:
      "AI models specialized in search and real-time knowledge retrieval.",
    icon: Perplexity,
    name: "Perplexity AI",
    subType: "perplexity",
    url: addRef("https://www.perplexity.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.endpoints.anyscale.com/v1",
      keyURL: addRef("https://docs.anyscale.com/auth/api-keys"),
    },
    description:
      "Scalable AI infrastructure built on Ray for distributed computing.",
    icon: Anyscale,
    name: "Anyscale",
    subType: "anyscale",
    url: addRef("https://www.anyscale.com"),
  },
  {
    api: {
      defaultBaseURL: "https://api.hyperbolic.xyz/v1",
      keyURL: addRef("https://docs.hyperbolic.xyz/docs/getting-started"),
    },
    description: "Budget-friendly GPU access for running various AI models.",
    icon: Hyperbolic,
    name: "Hyperbolic",
    subType: "hyperbolic",
    url: addRef("https://hyperbolic.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.x.ai/v1",
      keyURL: addRef("https://console.x.ai/team/default/api-keys"),
    },
    description: "Grok models from xAI",
    icon: XAI,
    name: "xAI Grok",
    subType: "x-ai",
    url: addRef("https://x.ai"),
  },
  {
    api: {
      defaultBaseURL: "https://api.mistral.ai/v1",
      keyURL: addRef("https://docs.mistral.ai/getting-started/quickstart/"),
    },
    description:
      "European AI provider with models optimized for coding and general tasks.",
    icon: Mistral,
    name: "Mistral AI",
    subType: "mistral",
    url: addRef("https://mistral.ai"),
  },
  {
    api: {
      defaultBaseURL: "http://localhost:8080/v1",
    },
    description:
      "Open-source offline ChatGPT alternative with 70+ models and customizable inference.",
    icon: Jan,
    name: "Jan.ai",
    requiresAPIKey: false,
    subType: "jan",
    url: addRef("https://jan.ai"),
  },
  {
    api: {
      defaultBaseURL: "http://localhost:1234/v1",
    },
    description:
      "Polished GUI for managing and running local LLMs with built-in chat interface.",
    icon: LMStudio,
    name: "LM Studio",
    requiresAPIKey: false,
    subType: "lmstudio",
    url: addRef("https://lmstudio.ai"),
  },
  {
    api: {
      defaultBaseURL: "http://localhost:8080/v1",
    },
    description:
      "Versatile drop-in replacement for OpenAI API supporting multiple architectures.",
    icon: LocalAI,
    name: "LocalAI",
    requiresAPIKey: false,
    subType: "localai",
    url: addRef("https://localai.io"),
  },
];
