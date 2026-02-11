import { dedent, pick } from "radashi";

import { getCurrentDate } from "../lib/get-current-date";
import { TOOLS } from "../tools/all";
import { setupAgent } from "./create-agent";
import {
  createContextMessage,
  createSystemInfoMessage,
  getProjectLayoutContext,
  getSystemInfoText,
  shouldContinueWithToolCalls,
} from "./shared";

export const explorerAgent = setupAgent({
  agentTools: pick(TOOLS, ["Glob", "Grep", "ReadFile"]),
  name: "explorer",
}).create(({ name }) => ({
  availableSubagents: [],
  description:
    "Fast agent specialized for reading and analyzing files. Use for simple file exploration tasks.",
  getMessages: async ({ appConfig, sessionId }) => {
    const now = getCurrentDate();

    const systemMessage = createSystemInfoMessage({
      agentName: name,
      now,
      sessionId,
      text: dedent`
        You are an explorer agent specialized in reading and analyzing files in the project directory.
        
        Your role is to:
        - Read files requested by the parent agent
        - Provide concise summaries of file contents
        - Answer specific questions about code or file structure
        
        Keep responses focused and concise. Return only the information requested.
      `.trim(),
    });

    const projectLayout = await getProjectLayoutContext(appConfig.appDir);

    const contextMessage = createContextMessage({
      agentName: name,
      now,
      sessionId,
      textParts: [getSystemInfoText(), projectLayout],
    });

    return [systemMessage, contextMessage];
  },
  onFinish: async () => {
    // No special cleanup needed for explorer agent
  },
  onStart: async () => {
    // No special initialization needed for explorer agent
  },
  shouldContinue: shouldContinueWithToolCalls,
}));
