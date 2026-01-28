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
  "write_file",
  "unavailable",
]);
