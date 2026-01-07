import ms from "ms";
import { z } from "zod";

import { executeError } from "../lib/execute-error";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

export const Choose = createTool({
  description:
    "Present a question with multiple choice options to the user and get their selection",
  execute: () => {
    return Promise.resolve(executeError("Not implemented"));
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
  timeoutMs: ms("1 second"),
  toModelOutput: ({ output: result }) => {
    return {
      type: "text",
      value: `User selected: ${result.selectedChoice}`,
    };
  },
});
