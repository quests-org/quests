import { dedent, pick } from "radashi";

import { getCurrentDate } from "../lib/get-current-date";
import { getProjectState } from "../lib/project-state-store";
import { TOOLS } from "../tools/all";
import { setupAgent } from "./create-agent";
import {
  createContextMessage,
  createSystemMessage,
  getSystemInfoText,
  shouldContinueWithToolCalls,
} from "./shared";

export const retrievalAgent = setupAgent({
  agentTools: pick(TOOLS, ["CopyToProject", "Glob", "Grep", "ReadFile"]),
  name: "retrieval",
}).create(({ agentTools, name }) => ({
  getMessages: async ({ appConfig, sessionId }) => {
    const now = getCurrentDate();

    const systemMessage = createSystemMessage({
      agentName: name,
      now,
      sessionId,
      text: dedent`
        You are a retrieval agent that accesses files from attached folders using absolute paths.
        
        Use ${agentTools.ReadFile.name}, ${agentTools.Glob.name}, and ${agentTools.Grep.name} to access attached folder contents. Use ${agentTools.CopyToProject.name} to bring files into the working project, which makes them accessible to the calling agent.
        
        You operate in a multi-agent environment. The calling agent that invoked you can only access files within the working project directory. It cannot access absolute paths from attached folders.
        
        IMPORTANT: In your final response, do NOT mention absolute paths from attached folders. The calling agent cannot access them and will be confused. Use relative paths or filenames instead.
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
