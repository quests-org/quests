import { dedent, pick } from "radashi";

import { getCurrentDate } from "../lib/get-current-date";
import { pathExists } from "../lib/path-exists";
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
        You are a retrieval agent that accesses files from attached folders.
        
        Use ${agentTools.ReadFile.name}, ${agentTools.Glob.name}, and ${agentTools.Grep.name} to access attached folder contents. Use ${agentTools.CopyToProject.name} to bring files into the working project.
        
        You operate in a multi-agent environment. The calling agent can only access the working project directory and cannot access absolute paths from attached folders.
        
        ## Path Rules
        
        1. INTERNALLY: Use absolute paths in tool calls to access attached folder files
        2. IN RESPONSES TO CALLING AGENT: NEVER show absolute paths. Instead:
           - Present paths relative to the attached folder (e.g., "folder/file.txt" not "/path/to/attached/folder/file.txt")
           - Or use simple filenames when the folder context is clear
           - Think: "What would be helpful and readable for the calling agent?" Not: "What is the technical absolute path?"
        3. Do NOT echo file contents back in your response. The calling agent already has access to copied files.
        
        When listing or referencing files, always strip the attached folder's absolute path prefix and show only the meaningful relative portion.
      `.trim(),
    });

    const projectState = await getProjectState(appConfig.appDir);

    const attachedFoldersText = projectState.attachedFolders
      ? await Promise.all(
          Object.values(projectState.attachedFolders).map(async (folder) => {
            const exists = await pathExists(folder.path);
            return exists
              ? `- ${folder.name}: ${folder.path}`
              : `- ${folder.name}: ${folder.path} (no longer exists)`;
          }),
        ).then((descriptions) => descriptions.join("\n"))
      : "No attached folders";

    const contextMessage = createContextMessage({
      agentName: name,
      now,
      sessionId,
      textParts: [
        getSystemInfoText(),
        dedent`
          <attached_folders>
          The user attached these folders to this project.
          ${attachedFoldersText}
          </attached_folders>
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
