import ms from "ms";
import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { TASK_AGENT_NAMES, type TaskAgentName } from "../agents/types";
import { APP_FOLDER_NAMES } from "../constants";
import { executeError } from "../lib/execute-error";
import { StoreId } from "../schemas/store-id";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const TOOL_NAME = "task";
const INPUT_PARAMS = {
  prompt: "prompt",
  subagent_type: "subagent_type",
} as const;

const TASK_AGENT_DESCRIPTIONS: Record<TaskAgentName, string> = {
  retrieval: dedent`
    Specialized agent for accessing files from user-attached folders. Use this when the user has attached folders to their message and you need to read, search, or copy files to this project from those folders.
    
    Files copied by this agent are placed in the ${APP_FOLDER_NAMES.agentRetrieved} folder in the project.
    
    IMPORTANT: This agent cannot directly access files inside the current project - it can only access and copy files from attached folders outside the project.
  `.trim(),
};

export const Task = createTool({
  description: (agentName) => {
    if (agentName === "main") {
      const TASK_AGENT_LIST = TASK_AGENT_NAMES.map(
        (name) => `- ${name}: ${TASK_AGENT_DESCRIPTIONS[name]}`,
      ).join("\n");

      return dedent`
        Launch a new agent to handle complex, multi-step tasks autonomously.

        The ${TOOL_NAME} tool launches specialized agents that autonomously handle complex tasks. Each agent has specific capabilities and tools available to it.

        Available agent types:
        ${TASK_AGENT_LIST}

        Usage notes:
        - The ${INPUT_PARAMS.prompt} should contain detailed instructions for the agent
        - The agent will return its result in a single message
      `.trim();
    }

    return "Only the main agent can spawn agents";
  },
  execute: async ({ agentName, input, signal, spawnAgent }) => {
    if (agentName !== "main") {
      return executeError("Only the main agent can spawn subagents");
    }

    const requestedAgentName = input.subagent_type as TaskAgentName;
    if (!TASK_AGENT_NAMES.includes(requestedAgentName)) {
      return executeError(
        `Unknown agent type: ${requestedAgentName}. Available types: ${TASK_AGENT_NAMES.join(", ")}`,
      );
    }

    const { messagesResult, sessionId } = await spawnAgent({
      agentName: requestedAgentName,
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

    const toolCounts: Partial<
      Record<(typeof messages)[number]["parts"][number]["type"], number>
    > = {};
    const copiedFiles: {
      destinationPath: string;
      size: number;
    }[] = [];

    for (const message of messages) {
      if (message.role === "assistant") {
        for (const part of message.parts) {
          if (part.type !== "text" && part.type !== "data-fileAttachments") {
            toolCounts[part.type] = (toolCounts[part.type] ?? 0) + 1;

            if (
              part.type === "tool-copy_to_project" &&
              part.state === "output-available"
            ) {
              copiedFiles.push(...part.output.files);
            }
          }
        }
      }
    }

    let resultWithFileList = resultText;
    if (copiedFiles.length > 0) {
      const fileListText = copiedFiles
        .map((file) => {
          const sizeKB = (file.size / 1024).toFixed(2);
          return `  - ${file.destinationPath} (${sizeKB} KB)`;
        })
        .join("\n");

      resultWithFileList += `\n\nCopied files:\n${fileListText}`;
    }

    const summaryParts: string[] = [];

    const readCount =
      (toolCounts["tool-read_file"] ?? 0) + (toolCounts["tool-glob"] ?? 0);
    if (readCount > 0) {
      summaryParts.push(`read ${readCount} file${readCount === 1 ? "" : "s"}`);
    }

    if (copiedFiles.length > 0) {
      summaryParts.push(
        `copied ${copiedFiles.length} file${copiedFiles.length === 1 ? "" : "s"}`,
      );
    }

    const searchCount = toolCounts["tool-grep"] ?? 0;
    if (searchCount > 0) {
      summaryParts.push(
        `ran ${searchCount} search${searchCount === 1 ? "" : "es"}`,
      );
    }

    const summary =
      summaryParts.length > 0 ? summaryParts.join(", ") : "nothing";

    return ok({
      result: resultWithFileList,
      sessionId,
      summary,
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.prompt]: z
      .string()
      .meta({ description: "The task for the agent to perform" }),
    [INPUT_PARAMS.subagent_type]: z.string().meta({
      description:
        "The type of specialized agent to use for this task. Generate this first.",
    }),
  }),
  name: TOOL_NAME,
  outputSchema: z.object({
    result: z.string(),
    sessionId: StoreId.SessionSchema,
    summary: z.string(),
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
