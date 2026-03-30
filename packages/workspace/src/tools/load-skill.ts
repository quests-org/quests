import ms from "ms";
import { ok } from "neverthrow";
import fsSync from "node:fs";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES } from "../constants";
import { copySkill } from "../lib/copy-skill";
import { toAgentPath } from "../lib/normalize-path";
import { runPnpmCommand } from "../lib/run-pnpm";
import { PNPM_COMMAND } from "../lib/shell-commands/pnpm";
import { TS_COMMAND } from "../lib/shell-commands/ts";
import {
  FILE_LIST_LIMIT,
  findSkill,
  findSkills,
  getSkillSources,
  listSkillFiles,
} from "../lib/skills";
import { type AbsolutePath } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";
const TAGS = {
  availableSkills: "available_skills",
  description: "description",
  file: "file",
  name: "name",
  skill: "skill",
  skillContent: "skill_content",
  skillFiles: "skill_files",
} as const;

function skillHasPackageJson(registryDir: AbsolutePath, name: string) {
  const skillsDir = getSkillSources(registryDir)[0];
  try {
    return (
      skillsDir !== undefined &&
      fsSync.existsSync(path.join(skillsDir, name, "package.json"))
    );
  } catch {
    return false;
  }
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
        ? `<${TAGS.availableSkills} />`
        : dedent`
            <${TAGS.availableSkills}>
            ${skills
              .map((s) =>
                [
                  `  <${TAGS.skill}>`,
                  `    <${TAGS.name}>${s.name}</${TAGS.name}>`,
                  `    <${TAGS.description}>${s.description}</${TAGS.description}>`,
                  `  </${TAGS.skill}>`,
                ].join("\n"),
              )
              .join("\n")}
            </${TAGS.availableSkills}>
          `;

    const examples = skills
      .map((s) => `'${s.name}'`)
      .slice(0, 3)
      .join(", ");
    const hint = examples.length > 0 ? ` (e.g., ${examples})` : "";

    return dedent`
      Load a specialized skill that provides domain-specific instructions and workflows for a specific task.
      When you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.

      The skill will inject detailed instructions and workflows into the conversation context.
      Tool output includes a <${TAGS.skillContent} name="..."> block with the loaded content.

      Invoke this tool to load a skill when a task matches one of the available skills listed below${hint}:

      ${skillsBlock}

      Note: if the skill includes a package.json, pnpm install will be run automatically in the project after the skill is copied.
    `.trim();
  },
  execute: async ({ appConfig, input, signal }) => {
    const { registryDir } = appConfig.workspaceConfig;
    const { all, skill } = await findSkill(registryDir, input.name);

    if (!skill) {
      const listing =
        all.length === 0
          ? "No skills are currently available."
          : all.map((s) => `- ${s.name}: ${s.description}`).join("\n");

      return ok({
        content: `Skill "${input.name}" not found.\n\nAvailable skills:\n\n${listing}`,
        name: input.name,
      });
    }

    const copyResult = await copySkill({
      appDir: appConfig.appDir,
      signal,
      skillDir: skill.skillDir,
      skillName: skill.name,
    });

    if (copyResult.isErr()) {
      return ok({
        content: copyResult.error.message,
        name: skill.name,
      });
    }

    const destDir = copyResult.value;
    const relativeSkillRoot = toAgentPath(APP_FOLDER_NAMES.skills, skill.name);
    const { files: copiedFiles, truncated } = await listSkillFiles(
      destDir,
      signal,
    );

    const hasPackageJson = copiedFiles.includes("package.json");

    let installSection = "";
    if (hasPackageJson) {
      const { combined, exitCode } = await runPnpmCommand({
        appConfig,
        args: ["install"],
        signal,
      });
      installSection =
        exitCode === 0
          ? [
              `\`${PNPM_COMMAND.name} install\` was run at the project root.`,
              `This is a monorepo -- skill dependencies are scoped to this skill's folder and are ready to use.`,
              `Do not run \`${PNPM_COMMAND.name} add\` for packages this skill already provides.`,
            ].join(" ")
          : [
              `\`${PNPM_COMMAND.name} install\` was run at the project root but exited with code ${exitCode}.`,
              `The skill's dependencies may not be fully installed.`,
              `Raw output:\n\`\`\`\n${combined}\n\`\`\``,
            ].join(" ");
      installSection = `\n\n${installSection}`;
    }

    const truncationNote = truncated
      ? `\nNote: file list truncated at ${FILE_LIST_LIMIT} entries.`
      : "";

    const fileListXml = [
      `<${TAGS.skillFiles}>`,
      ...copiedFiles.map(
        (f) => `<${TAGS.file}>${relativeSkillRoot}/${f}</${TAGS.file}>`,
      ),
      `</${TAGS.skillFiles}>`,
    ].join("\n");

    const fileSectionText = [
      `The skill files below are copied into your project and are yours to edit.`,
      `Before writing anything new, read the relevant script(s) and run them with \`${TS_COMMAND.name}\` if they fit.`,
      `Only write a custom script if the existing ones cannot handle the task even with modification.`,
    ].join(" ");

    const fileSection =
      copiedFiles.length > 0
        ? `\n\n${fileSectionText}\n\n${fileListXml}${truncationNote}`
        : "";

    const content =
      `<${TAGS.skillContent} name="${skill.name}">\n` +
      skill.content +
      fileSection +
      installSection +
      `\n</${TAGS.skillContent}>`;

    return ok({ content, name: skill.name });
  },
  readOnly: false,
  timeoutMs: ({ appConfig, input }) => {
    const base = ms("10 seconds");
    const extra = skillHasPackageJson(
      appConfig.workspaceConfig.registryDir,
      input.name,
    )
      ? ms("2 minutes")
      : 0;
    return base + extra;
  },
  toModelOutput: ({ output }) => ({
    type: "text",
    value: output.content,
  }),
});
