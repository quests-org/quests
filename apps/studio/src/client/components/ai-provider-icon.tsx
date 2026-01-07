import type { ComponentType } from "react";

import { Anyscale } from "@/client/components/icons/anyscale";
import { Cerebras } from "@/client/components/icons/cerebras";
import { DeepInfra } from "@/client/components/icons/deepinfra";
import { DeepSeek } from "@/client/components/icons/deepseek";
import { Fireworks } from "@/client/components/icons/fireworks";
import { Groq } from "@/client/components/icons/groq";
import { HuggingFace } from "@/client/components/icons/huggingface";
import { Hyperbolic } from "@/client/components/icons/hyperbolic";
import { Jan } from "@/client/components/icons/jan";
import { LMStudio } from "@/client/components/icons/lmstudio";
import { LocalAI } from "@/client/components/icons/localai";
import { Minimax } from "@/client/components/icons/minimax";
import { Mistral } from "@/client/components/icons/mistral";
import { Novita } from "@/client/components/icons/novita";
import { Perplexity } from "@/client/components/icons/perplexity";
import { Together } from "@/client/components/icons/together";
import { XAI } from "@/client/components/icons/x-ai";
import { ZAI } from "@/client/components/icons/z-ai";
import { OpenRouter } from "@/client/components/service-icons";
import { QuestsLogoSimpleIcon } from "@quests/components/logo-simple";
import { type AIProviderType } from "@quests/shared";
import { GrNodes } from "react-icons/gr";
import {
  SiAnthropic,
  SiGooglegemini,
  SiOllama,
  SiOpenai,
  SiVercel,
} from "react-icons/si";

const PROVIDER_ICON_MAP: Record<
  AIProviderType,
  ComponentType<{ className?: string }> | null
> = {
  anthropic: SiAnthropic,
  anyscale: Anyscale,
  cerebras: Cerebras,
  deepinfra: DeepInfra,
  deepseek: DeepSeek,
  fireworks: Fireworks,
  google: SiGooglegemini,
  groq: Groq,
  huggingface: HuggingFace,
  hyperbolic: Hyperbolic,
  jan: Jan,
  lmstudio: LMStudio,
  localai: LocalAI,
  minimax: Minimax,
  mistral: Mistral,
  novita: Novita,
  ollama: SiOllama,
  openai: SiOpenai,
  "openai-compatible": GrNodes,
  openrouter: OpenRouter,
  perplexity: Perplexity,
  quests: QuestsLogoSimpleIcon,
  together: Together,
  vercel: SiVercel,
  "x-ai": XAI,
  "z-ai": ZAI,
};

export function AIProviderIcon({
  className = "size-5",
  type,
}: {
  className?: string;
  type: AIProviderType;
}) {
  const Icon = PROVIDER_ICON_MAP[type] ?? GrNodes;
  return <Icon className={className} />;
}
