import { dedent, pick } from "radashi";

import { getCurrentDate } from "../lib/get-current-date";
import { getProjectState } from "../lib/project-state-store";
import { TOOLS } from "../tools/all";
import { setupAgent } from "./create-agent";
import {
  createContextMessage,
  createSystemInfoMessage,
  getSystemInfoText,
  shouldContinueWithToolCalls,
} from "./shared";

export const retrievalAgent = setupAgent({
  agentTools: pick(TOOLS, ["CopyToProject", "Glob", "Grep", "ReadFile"]),
  name: "retrieval",
}).create(({ name }) => ({
  description:
    "Specialized agent for retrieving files from attached folders. Can read, search, and copy files from user-attached directories.",
  getMessages: async ({ appConfig, sessionId }) => {
    const now = getCurrentDate();

    const systemMessage = createSystemInfoMessage({
      agentName: name,
      now,
      sessionId,
      text: dedent`
        You are a retrieval agent specialized in accessing files from attached folders.
        
        Your role is to:
        - Read files from attached folders using absolute paths
        - Search for content within attached folders
        - Copy files from attached folders to the project when requested
        
        Important notes:
        - All file paths must be absolute paths within the attached folders
        - You can see the list of attached folders in the context below
        - Use the CopyToProject tool to bring files into the working project
        - Keep responses focused and concise
      `.trim(),
    });

    // Load project state to get attached folders
    const projectState = await getProjectState(appConfig.appDir);

    const attachedFoldersText = projectState.attachedFolders
      ? Object.values(projectState.attachedFolders)
          .map((folder) => `- ${folder.name}: ${folder.path}`)
          .join("\n")
      : "No attached folders";

    const contextMessage = createContextMessage({
      agentName: name,
      now,
      sessionId,
      textParts: [
        getSystemInfoText(),
        dedent`
          ## Attached Folders
          
          ${attachedFoldersText}
        `.trim(),
      ],
    });

    return [systemMessage, contextMessage];
  },
  onFinish: async () => {
    // No special cleanup needed for retrieval agent
  },
  onStart: async () => {
    // No special initialization needed for retrieval agent
  },
  shouldContinue: shouldContinueWithToolCalls,
}));
