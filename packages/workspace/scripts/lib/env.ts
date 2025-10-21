import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {},
  clientPrefix: "PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    QUESTS_AI_GATEWAY_API_KEY: z.string().optional(),
    QUESTS_ANTHROPIC_API_KEY: z.string().optional(),
    QUESTS_CEREBRAS_API_KEY: z.string().optional(),
    QUESTS_GOOGLE_API_KEY: z.string().optional(),
    QUESTS_GROQ_API_KEY: z.string().optional(),
    QUESTS_OPENAI_API_KEY: z.string().optional(),
    QUESTS_OPENROUTER_API_KEY: z.string().optional(),
    QUESTS_ZAI_API_KEY: z.string().optional(),
  },
});
