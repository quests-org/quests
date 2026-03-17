import { z } from "zod";

export const TOOL_NAMES = {
  choose: "choose",
  copyToProject: "copy_to_project",
  editFile: "edit_file",
  generateImage: "generate_image",
  glob: "glob",
  grep: "grep",
  loadSkill: "load_skill",
  readFile: "read_file",
  runShellCommand: "run_shell_command",
  task: "task",
  unavailable: "unavailable",
  webSearch: "web_search",
  writeFile: "write_file",
} as const;

export const ToolNameSchema = z.enum([
  TOOL_NAMES.choose,
  TOOL_NAMES.copyToProject,
  TOOL_NAMES.editFile,
  TOOL_NAMES.generateImage,
  TOOL_NAMES.glob,
  TOOL_NAMES.grep,
  TOOL_NAMES.loadSkill,
  TOOL_NAMES.readFile,
  TOOL_NAMES.runShellCommand,
  TOOL_NAMES.task,
  TOOL_NAMES.unavailable,
  TOOL_NAMES.webSearch,
  TOOL_NAMES.writeFile,
]);
