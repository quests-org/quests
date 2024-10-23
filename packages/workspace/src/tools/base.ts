import { z } from "zod";

export const TOOL_EXPLANATION_PARAM_NAME = "explanation";

export const BaseInputSchema = z.object({
  // All tools ask the agent to explain why they are using the tool
  [TOOL_EXPLANATION_PARAM_NAME]: z
    .string()
    .optional() // Some LLMs leave it out on accident
    .meta({
      description: "One short sentence about why you are using this tool",
    }),
});
