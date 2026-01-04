import { z } from "zod";

export const ToolNameSchema = z.enum([
  "choose",
  "edit_file",
  "glob",
  "grep",
  "read_file",
  "run_diagnostics",
  "run_git_commands",
  "run_shell_command",
  "think",
  "write_file",
  "unavailable",
]);
