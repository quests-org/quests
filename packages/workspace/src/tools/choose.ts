import { err } from "neverthrow";
import { z } from "zod";

import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

export const Choose = createTool({
  description:
    "Present a question with multiple choice options to the user and get their selection",
  execute: () => {
    return Promise.resolve(
      err({
        message: "Not implemented",
        type: "execute-error",
      }),
    );
  },
  inputSchema: BaseInputSchema.extend({
    choices: z.array(z.string()).min(2).meta({
      description: "Array of choice options for the user to select from",
    }),
    question: z
      .string()
      .meta({ description: "The question to present to the user" }),
  }),
  name: "choose",
  outputSchema: z.object({
    selectedChoice: z.string(),
  }),
  readOnly: true,
  timeoutMs: 1000,
  toModelOutput: ({ output: result }) => {
    return {
      type: "text",
      value: `User selected: ${result.selectedChoice}`,
    };
  },
});
