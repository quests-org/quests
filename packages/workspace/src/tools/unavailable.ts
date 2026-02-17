import ms from "ms";
import { dedent } from "radashi";
import { z } from "zod";

import { executeError } from "../lib/execute-error";
import { setupTool } from "./create-tool";

export const Unavailable = setupTool({
  inputSchema: z.any(),
  name: "unavailable",
  outputSchema: z.any(),
}).create({
  description: dedent`
    A placeholder tool for unknown or unavailable tools.

    - This tool is used when a requested tool is not available or not implemented.
    - It provides a standardized response for missing functionality.
  `,
  execute: () =>
    Promise.resolve(
      executeError("This tool is not available or not implemented."),
    ),
  readOnly: true,
  timeoutMs: ms("1 second"),
  toModelOutput: () => {
    return {
      type: "text",
      value: "This tool is not available.",
    };
  },
});
