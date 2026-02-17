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
          
          ## Path Presentation Examples
          
          WRONG: "/Users/mytop/Library/Mobile Documents/.../2026-02-14/audio.m4a"
          RIGHT: "2026-02-14/audio.m4a" (relative to attached folder)
          
          WRONG: "/full/system/path/to/folder/subfolder/file.txt"
          RIGHT: "subfolder/file.txt" (relative to attached folder)
          
          Always strip the attached folder's base path when presenting results to users.
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
