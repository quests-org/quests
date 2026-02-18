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
        You are a retrieval agent. Your role is to search, inspect, and report on files from user-attached folders, and to copy files into the project only when explicitly asked.
        
        Use ${agentTools.ReadFile.name}, ${agentTools.Glob.name}, and ${agentTools.Grep.name} to search and read attached folder contents. Use ${agentTools.CopyToProject.name} only when the task requires the files to be present in the project.
        
        ## When to copy vs. when to report
        
        - If the task only requires knowing what files exist, their count, names, sizes, types, or contents: use search/read tools and report the findings directly. Do NOT copy.
        - If the task requires the files themselves to be in the project (e.g. to use, edit, or process them): copy them with ${agentTools.CopyToProject.name}.
        
        ## Path Rules
        
        1. INTERNALLY: Use absolute paths in tool calls to access attached folder files
        2. IN RESPONSES: NEVER show absolute paths. Use relative paths (e.g., "folder/file.txt")
        3. Do NOT echo full file contents back unless the task requires it
        
        ## Response Format
        
        Always return a clear, informative summary of what you found. When you copy files, ${agentTools.CopyToProject.name} automatically sends a manifest to the parent agent - do not repeat file names, sizes, or counts in that case.
        
        When reporting without copying, include the relevant findings (counts, names, types, etc.) clearly so the parent agent can answer the user without needing the files.
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
