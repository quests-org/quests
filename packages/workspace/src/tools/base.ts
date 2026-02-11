import { AIGatewayProviderConfig } from "@quests/ai-gateway";
import { z } from "zod";

export const TOOL_EXPLANATION_PARAM_NAME = "explanation";

export const BaseInputSchema = z.object({
  // All tools ask the agent to explain why they are using the tool
  [TOOL_EXPLANATION_PARAM_NAME]: z
    .string()
    .optional() // Some LLMs leave it out on accident
    .meta({
      description:
        "One short sentence describing what this tool is doing, using present continuous tense (e.g., 'Reading the file', 'Exploring the folder'). Generate this first.",
    }),
});

export const ProviderOutputSchema = AIGatewayProviderConfig.Schema.pick({
  displayName: true,
  id: true,
  type: true,
});

export const UsageOutputSchema = z.object({
  inputTokens: z.union([z.number(), z.nan()]).optional(),
  outputTokens: z.union([z.number(), z.nan()]).optional(),
  totalTokens: z.union([z.number(), z.nan()]).optional(),
});
