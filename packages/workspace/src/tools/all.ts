import { type InferUITools } from "ai";
import { type z } from "zod";

import type { AnyAgentTool, ToolName } from "./types";

import { Choose } from "./choose";
import { CopyToProject } from "./copy-to-project";
import { EditFile } from "./edit-file";
import { GenerateImage } from "./generate-image";
import { Glob } from "./glob";
import { Grep } from "./grep";
import { LoadSkill } from "./load-skill";
import { ReadFile } from "./read-file";
import { RunDiagnostics } from "./run-diagnostics";
import { RunShellCommand } from "./run-shell-command";
import { Task } from "./task";
import { Think } from "./think";
import { Unavailable } from "./unavailable";
import { WebSearch } from "./web-search";
import { WriteFile } from "./write-file";

export const TOOLS = {
  Choose,
  CopyToProject,
  EditFile,
  GenerateImage,
  Glob,
  Grep,
  LoadSkill,
  ReadFile,
  RunDiagnostics,
  RunShellCommand,
  Task,
  Think,
  Unavailable,
  WebSearch,
  WriteFile,
};

export type InternalToolName = keyof typeof TOOLS;

export const TOOLS_BY_NAME = {
  [TOOLS.Choose.name]: TOOLS.Choose,
  [TOOLS.CopyToProject.name]: TOOLS.CopyToProject,
  [TOOLS.EditFile.name]: TOOLS.EditFile,
  [TOOLS.GenerateImage.name]: TOOLS.GenerateImage,
  [TOOLS.Glob.name]: TOOLS.Glob,
  [TOOLS.Grep.name]: TOOLS.Grep,
  [TOOLS.LoadSkill.name]: TOOLS.LoadSkill,
  [TOOLS.ReadFile.name]: TOOLS.ReadFile,
  [TOOLS.RunDiagnostics.name]: TOOLS.RunDiagnostics,
  [TOOLS.RunShellCommand.name]: TOOLS.RunShellCommand,
  [TOOLS.Task.name]: TOOLS.Task,
  [TOOLS.Think.name]: TOOLS.Think,
  [TOOLS.Unavailable.name]: TOOLS.Unavailable,
  [TOOLS.WebSearch.name]: TOOLS.WebSearch,
  [TOOLS.WriteFile.name]: TOOLS.WriteFile,
  // `satisfies` ensures all tool names are present
} as const satisfies Record<ToolName, AnyAgentTool>;

export const TOOLS_FOR_MODEL_OUTPUT = Object.fromEntries(
  Object.values(TOOLS_BY_NAME).map((tool) => [
    tool.name,
    tool.staticAISDKTool(),
  ]),
);

export type AISDKTools = InferUITools<{
  [K in keyof typeof TOOLS_BY_NAME]: ReturnType<
    (typeof TOOLS_BY_NAME)[K]["staticAISDKTool"]
  >;
}>;

export type ToolOutputByName = {
  [K in ToolName]: {
    output: z.output<(typeof TOOLS_BY_NAME)[K]["outputSchema"]>;
    toolName: K;
  };
}[ToolName];

export function getToolByType<T extends ToolName>(
  type: `tool-${T}`,
): (typeof TOOLS_BY_NAME)[T] {
  const toolName = type.replace("tool-", "") as T;
  return TOOLS_BY_NAME[toolName];
}
