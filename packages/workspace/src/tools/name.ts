import { z } from "zod";

export const ToolNameSchema = z.enum([
  "choose",
  "copy_to_project",
  "edit_file",
  "generate_image",
  "glob",
  "grep",
  "load_skill",
  "read_file",
  "run_diagnostics",
  "run_shell_command",
  "task",
  "think",
  "unavailable",
  "web_search",
  "write_file",
]);
