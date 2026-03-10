import ms from "ms";
import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES, REGISTRY_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { findSkills } from "../lib/skills";
import { type AbsolutePath } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const FILE_LIST_LIMIT = 50;

const TAGS = {
  availableSkills: "available_skills",
  description: "description",
  file: "file",
  name: "name",
  skill: "skill",
  skillContent: "skill_content",
  skillFiles: "skill_files",
} as const;

async function copySkillToProject(
  skillDir: AbsolutePath,
  destDir: AbsolutePath,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  try {
    await fs.access(destDir);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    // Destination does not exist yet, proceed with copy
  }
  signal.throwIfAborted();
  await fs.mkdir(destDir, { recursive: true });
  signal.throwIfAborted();
  await fs.cp(skillDir, destDir, { recursive: true });
}

function getSkillDestDir(appDir: AbsolutePath, skillName: string) {
  return absolutePathJoin(
    appDir,
    APP_FOLDER_NAMES.agents,
    APP_FOLDER_NAMES.agentsSkills,
    skillName,
  );
}

function getSkillSources(registryDir: AbsolutePath) {
  return [absolutePathJoin(registryDir, REGISTRY_FOLDER_NAMES.skills)];
}

async function listSkillFiles(
  destDir: AbsolutePath,
  signal: AbortSignal,
): Promise<{ files: string[]; truncated: boolean }> {
  const results: string[] = [];
  let truncated = false;

  async function walk(dir: string, relBase: string) {
    signal.throwIfAborted();
    if (truncated) {
      return;
    }
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), relPath);
      } else if (entry.name !== "SKILL.md") {
        results.push(relPath);
        if (results.length >= FILE_LIST_LIMIT) {
          truncated = true;
          return;
        }
      }
    }
  }

  await walk(destDir, "");
  return { files: results, truncated };
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
            ${skills.map((s) => `  <${TAGS.skill}>\n    <${TAGS.name}>${s.name}</${TAGS.name}>\n    <${TAGS.description}>${s.description}</${TAGS.description}>\n  </${TAGS.skill}>`).join("\n")}
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
    `.trim();
  },
  execute: async ({ appConfig, input, signal }) => {
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

    const destDir = getSkillDestDir(appConfig.appDir, skill.name);
    await copySkillToProject(skill.skillDir, destDir, signal);

    const relativeSkillRoot = path.join(
      APP_FOLDER_NAMES.agents,
      APP_FOLDER_NAMES.agentsSkills,
      skill.name,
    );
    const { files: copiedFiles, truncated } = await listSkillFiles(
      destDir,
      signal,
    );

    const truncationNote = truncated
      ? `\nNote: file list truncated at ${FILE_LIST_LIMIT} entries.`
      : "";
    const fileSection =
      copiedFiles.length > 0
        ? `\n\nThe skill files listed below have been copied into your project. Prefer using them as-is before modifying or replacing them.\n\n<${TAGS.skillFiles}>\n${copiedFiles.map((f) => `<${TAGS.file}>${relativeSkillRoot}/${f}</${TAGS.file}>`).join("\n")}\n</${TAGS.skillFiles}>${truncationNote}`
        : "";

    const content = `<${TAGS.skillContent} name="${skill.name}">\n${skill.content}${fileSection}\n</${TAGS.skillContent}>`;

    return ok({ content, name: skill.name });
  },
  readOnly: false,
  timeoutMs: ms("10 seconds"),
  toModelOutput: ({ output }) => ({
    type: "text",
    value: output.content,
  }),
});
