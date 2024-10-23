import { dedent } from "radashi";
import { z } from "zod";

import { fileTree } from "../lib/file-tree";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

export const FileTree = createTool({
  description: dedent`
    Displays the file structure of the codebase in a tree format.

    - Use this tool to understand the file structure of the codebase.
  `,
  execute: async ({ appConfig, signal }) => {
    const result = await fileTree(appConfig.appDir, { signal });

    return result
      .mapErr((error) => ({
        message: `${error.type}: ${error.message}`,
        type: "execute-error" as const,
      }))
      .map((tree) => ({ tree }));
  },
  inputSchema: BaseInputSchema,
  name: "file_tree",
  outputSchema: z.object({
    tree: z.string().meta({ description: "The file tree of the codebase" }),
  }),
  readOnly: true,
  timeoutMs: 5000, // File system operations
  toModelOutput: ({ output }) => {
    return {
      type: "text",
      value: output.tree,
    };
  },
});
