import ms from "ms";
import { ok } from "neverthrow";
import fs from "node:fs/promises";
import { dedent } from "radashi";
import { z } from "zod";

import { REGISTRY_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { findSkills } from "../lib/skills";
import { type AbsolutePath } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const SKILL_FILES_LIMIT = 10;

function getSkillSources(registryDir: AbsolutePath) {
  return [absolutePathJoin(registryDir, REGISTRY_FOLDER_NAMES.skills)];
}

export const LoadSkill = setupTool({
  inputSchema: BaseInputSchema.extend({
    name: z.string().meta({
      description: "The name of the skill to load.",
    }),
  }),
  name: "load_skill",
  outputSchema: z.object({
    content: z.string(),
    name: z.string(),
  }),
}).create({
  description: async ({ appConfig }) => {
    const sources = getSkillSources(appConfig.workspaceConfig.registryDir);
    const skills = await findSkills(sources);

    const skillsBlock =
      skills.length === 0
        ? "<available_skills />"
        : dedent`
            <available_skills>
            ${skills.map((s) => `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`).join("\n")}
            </available_skills>
          `;

    return dedent`
      Load a specialized skill that provides domain-specific instructions for a specific task.
      When you recognize that a task matches one of the available skills listed below, use this tool to load the full instructions.

      ${skillsBlock}
    `.trim();
  },
  execute: async ({ appConfig, input }) => {
    const sources = getSkillSources(appConfig.workspaceConfig.registryDir);
    const skills = await findSkills(sources);

    const skill = skills.find((s) => s.name === input.name);

    if (!skill) {
      const listing =
        skills.length === 0
          ? "No skills are currently available."
          : skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");

      return ok({
        content: `Skill "${input.name}" not found.\n\nAvailable skills:\n\n${listing}`,
        name: input.name,
      });
    }

    let colocatedFiles: string[] = [];
    try {
      const entries = await fs.readdir(skill.skillDir, { withFileTypes: true });
      colocatedFiles = entries
        .filter((e) => e.isFile() && e.name !== "SKILL.md")
        .map((e) => e.name)
        .slice(0, SKILL_FILES_LIMIT);
    } catch {
      // If we can't read the directory, just omit the file list
    }

    const fileSection =
      colocatedFiles.length > 0
        ? `\n\n<skill_files>\n${colocatedFiles.map((f) => `<file>${f}</file>`).join("\n")}\n</skill_files>`
        : "";

    const content = `<skill_content name="${skill.name}">\n${skill.content}${fileSection}\n</skill_content>`;

    return ok({ content, name: skill.name });
  },
  readOnly: true,
  timeoutMs: ms("10 seconds"),
  toModelOutput: ({ output }) => ({
    type: "text",
    value: output.content,
  }),
});
