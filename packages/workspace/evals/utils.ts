import {
  AIGatewayModelURI,
  type AIGatewayProviderConfig,
} from "@quests/ai-gateway";
import { AIProviderConfigIdSchema } from "@quests/shared";
import path from "node:path";

import { env } from "../scripts/lib/env";
import { AbsolutePathSchema, WorkspaceDirSchema } from "../src/schemas/paths";
import { type WorkspaceConfig } from "../src/types";

export function buildReportWorkspaceConfig(
  absoluteWorkspaceDir: string,
): WorkspaceConfig {
  return {
    captureEvent: () => {
      return;
    },
    captureException: () => {
      return;
    },
    getAIProviderConfigs: () => [],
    nodeExecEnv: {},
    pnpmBinPath: AbsolutePathSchema.parse("/usr/bin/pnpm"),
    previewsDir: WorkspaceDirSchema.parse(
      path.join(absoluteWorkspaceDir, "previews"),
    ),
    projectsDir: WorkspaceDirSchema.parse(
      path.join(absoluteWorkspaceDir, "projects"),
    ),
    registryDir: WorkspaceDirSchema.parse("/tmp/registry"),
    rootDir: WorkspaceDirSchema.parse(absoluteWorkspaceDir),
    templatesDir: WorkspaceDirSchema.parse(
      path.join(absoluteWorkspaceDir, "registry", "templates"),
    ),
    trashItem: () => Promise.resolve(),
  };
}

const PROVIDER_MAP: {
  envKey: keyof typeof env;
  type: AIGatewayProviderConfig.Type["type"];
}[] = [
  { envKey: "QUESTS_OPENAI_API_KEY", type: "openai" },
  { envKey: "QUESTS_OPENROUTER_API_KEY", type: "openrouter" },
  { envKey: "QUESTS_ANTHROPIC_API_KEY", type: "anthropic" },
  { envKey: "QUESTS_GOOGLE_API_KEY", type: "google" },
  { envKey: "QUESTS_AI_GATEWAY_API_KEY", type: "vercel" },
  { envKey: "QUESTS_ZAI_API_KEY", type: "z-ai" },
  { envKey: "QUESTS_CEREBRAS_API_KEY", type: "cerebras" },
  { envKey: "QUESTS_GROQ_API_KEY", type: "groq" },
];

function providerConfigId(type: AIGatewayProviderConfig.Type["type"]): string {
  return `${type}-config-id`;
}

export const modelURI = {
  openRouter: (model: string) =>
    AIGatewayModelURI.Schema.parse(
      `${model}?provider=openrouter&providerConfigId=${providerConfigId("openrouter")}`,
    ),
};

export function buildProviderConfigs(): AIGatewayProviderConfig.Type[] {
  const cacheIdentifier = "quests-evals";
  const configs: AIGatewayProviderConfig.Type[] = [
    // Uncomment to test with Ollama
    // {
    //   apiKey: "ollama",
    //   cacheIdentifier,
    //   id: providerConfigId("ollama"),
    //   type: "ollama",
    // },
  ];

  for (const { envKey, type } of PROVIDER_MAP) {
    const apiKey = env[envKey];
    if (apiKey) {
      configs.push({
        apiKey,
        cacheIdentifier,
        id: AIProviderConfigIdSchema.parse(providerConfigId(type)),
        type,
      });
    }
  }

  return configs;
}
