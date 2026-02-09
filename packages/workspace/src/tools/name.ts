import { z } from "zod";

export const ToolNameSchema = z.enum([
  "choose",
  "edit_file",
  "generate_image",
  "glob",
  "grep",
  "read_file",
  "run_diagnostics",
  "run_shell_command",
  "think",
  "unavailable",
  "web_fetch",
  "web_search",
  "write_file",
]);
