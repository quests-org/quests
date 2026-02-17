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
        You are a retrieval agent. Your role is to retrieve and copy files, NOT to report on them.
        
        Use ${agentTools.ReadFile.name}, ${agentTools.Glob.name}, and ${agentTools.Grep.name} to access attached folder contents. Use ${agentTools.CopyToProject.name} to copy files into the working project.
        
        ## Path Rules
        
        1. INTERNALLY: Use absolute paths in tool calls to access attached folder files
        2. IN RESPONSES: NEVER show absolute paths. Use relative paths (e.g., "folder/file.txt")
        3. Do NOT echo file contents back
        
        ## Response Format
        
        ${agentTools.CopyToProject.name} automatically sends a complete manifest (names, paths, sizes, counts, totals) to the parent agent. The tool handles ALL reporting.
        
        NEVER include: file names, paths, counts, sizes, formats, "successfully copied", summary sections
        
        ONLY include (when relevant): brief completion acknowledgment, high-level insights, filtering decisions, problems encountered
        
        Examples:
        GOOD: "Retrieved all files from the folder."
        GOOD: "Retrieved the requested files. These appear to be duplicate test images."
        BAD: "Found 9 PNG files. All have been successfully copied."
        BAD: "The folder contains 9 PNG files (154KB total)."
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
