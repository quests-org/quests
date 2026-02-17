import ms from "ms";
import { ok } from "neverthrow";
import { z } from "zod";

import { setupTool } from "./create-tool";

// Deprecated as of 2026-01-08, as most models don't use it
export const Think = setupTool({
  // No reasoning is needed for this tool
  inputSchema: z
    .object({
      thought: z.string().meta({ description: "Your thoughts." }),
    })
    .strict(),
  name: "think",
  outputSchema: z.object({
    thought: z.string(),
  }),
}).create({
  description:
    // Via https://www.anthropic.com/engineering/claude-think-tool
    "Use the tool to think about something. It will not obtain new information or make any changes to the repository, but just log the thought. Use it when complex reasoning or brainstorming is needed. For example, if you explore the repo and discover the source of a bug, call this tool to brainstorm several unique ways of fixing the bug, and assess which change(s) are likely to be simplest and most effective. Alternatively, if you receive some test results, call this tool to brainstorm ways to fix the failing tests.",
  execute: ({ input }) => {
    return Promise.resolve(ok({ thought: input.thought }));
  },
  readOnly: true,
  timeoutMs: ms("1 second"),
  toModelOutput: () => {
    return {
      type: "text",
      value: "Thought logged.",
    };
  },
});
