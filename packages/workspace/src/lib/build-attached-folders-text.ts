import { dedent } from "radashi";

import { RETRIEVAL_AGENT_NAME } from "../agents/types";

export function buildAttachedFoldersText({
  folderNames,
  intro,
}: {
  folderNames: string[];
  intro: string;
}) {
  const folderList = folderNames.map((name) => `- ${name}`).join("\n");
  return dedent`
    <attached_folders>
    ${intro}
    ${folderList}
    
    These folders are NOT accessible to your tools. Use the ${RETRIEVAL_AGENT_NAME} agent to search or copy files from them.
    </attached_folders>
  `;
}
