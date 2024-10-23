import { ok } from "neverthrow";
import { z } from "zod";

import { createTool } from "./create-tool";

export const Think = createTool({
  description:
    // Via https://www.anthropic.com/engineering/claude-think-tool
    "Use the tool to think about something. It will not obtain new information or make any changes to the repository, but just log the thought. Use it when complex reasoning or brainstorming is needed. For example, if you explore the repo and discover the source of a bug, call this tool to brainstorm several unique ways of fixing the bug, and assess which change(s) are likely to be simplest and most effective. Alternatively, if you receive some test results, call this tool to brainstorm ways to fix the failing tests.",
  execute: ({ input }) => {
    return Promise.resolve(ok({ thought: input.thought }));
  },
  name: "think",
  // No reasoning is needed for this tool
  inputSchema: z
    .object({
      thought: z.string().meta({ description: "Your thoughts." }),
    })
    .strict(),
  outputSchema: z.object({
    thought: z.string(),
  }),
  readOnly: true,
  timeoutMs: 1000,
  toModelOutput: () => {
    return {
      type: "text",
      value: "Thought logged.",
    };
  },
});
