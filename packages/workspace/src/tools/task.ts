import ms from "ms";
import { ok } from "neverthrow";
import { z } from "zod";

import { type AgentName } from "../agents/types";
import { executeError } from "../lib/execute-error";
import { StoreId } from "../schemas/store-id";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { ReadFile } from "./read-file";

const INPUT_PARAMS = {
  prompt: "prompt",
  subagent_type: "subagent_type",
} as const;

// Hard-coded list of available subagents from main agent
const AVAILABLE_SUBAGENTS: AgentName[] = ["explorer"];

// Map agent names to their descriptions
const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  explorer: "File exploration agent",
  main: "General-purpose assistant agent",
};

// Build description with available agents
const agentList: string = AVAILABLE_SUBAGENTS.map(
  (name) => `- ${name}: ${AGENT_DESCRIPTIONS[name]}`,
).join("\n");

const DESCRIPTION = `Launch a new agent to handle complex, multi-step tasks autonomously.

The Task tool launches specialized subagents that autonomously handle complex tasks. Each subagent has specific capabilities and tools available to it.

When using the Task tool, you must specify a ${INPUT_PARAMS.subagent_type} parameter to select which agent type to use.

Available agent types:
${agentList}

When to use the Task tool:
- When you need to delegate a specific subtask to a specialized agent
- When you want to explore files or analyze code in parallel

When NOT to use the Task tool:
- For simple file reads - use the ${ReadFile.name} tool directly instead
- For simple searches - use the ${Grep.name} or ${Glob.name} tools directly instead
- For tasks that don't match the available agent descriptions

Usage notes:
- The ${INPUT_PARAMS.prompt} should contain detailed instructions for the agent
- The agent will return its result in a single message
- Launch multiple agents concurrently whenever possible by calling this tool multiple times in a single response`;

export const Task = createTool({
  description: DESCRIPTION,
  execute: async ({ agentName, input, signal, spawnAgent }) => {
    if (agentName !== "main") {
      return executeError("Only the main agent can spawn subagents");
    }

    const requestedAgent = input.subagent_type as AgentName;
    if (!AVAILABLE_SUBAGENTS.includes(requestedAgent)) {
      return executeError(
        `Unknown agent type: ${requestedAgent}. Available types: ${AVAILABLE_SUBAGENTS.join(", ")}`,
      );
    }

    const { messagesResult, sessionId } = await spawnAgent({
      agentName: requestedAgent,
      prompt: input.prompt,
      signal,
    });

    if (messagesResult.isErr()) {
      return executeError(messagesResult.error.message);
    }
    const messages = messagesResult.value;

    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (!lastAssistantMessage) {
      return executeError("Subagent did not produce a response");
    }

    const resultText: string = lastAssistantMessage.parts
      .flatMap((part) => {
        switch (part.type) {
          case "text": {
            return [part.text];
          }
          default: {
            return [];
          }
        }
      })
      .join("\n");

    return ok({
      result: resultText,
      sessionId,
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.prompt]: z
      .string()
      .meta({ description: "The task for the agent to perform" }),
    [INPUT_PARAMS.subagent_type]: z.string().meta({
      description: "The type of specialized agent to use for this task",
    }),
  }),
  name: "task",
  outputSchema: z.object({
    result: z.string(),
    sessionId: StoreId.SessionSchema,
  }),
  readOnly: false,
  timeoutMs: ms("10 minutes"),
  toModelOutput: ({ output }) => {
    return {
      type: "text",
      value: output.result,
    };
  },
});
