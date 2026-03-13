import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

interface SkillInfo {
  content: string;
  description: string;
  name: string;
  skillDir: AbsolutePath;
}

export async function findSkills(dirs: AbsolutePath[]): Promise<SkillInfo[]> {
  const skillMap = new Map<string, SkillInfo>();

  for (const dir of dirs) {
    const skills = await findSkillsInDir(dir);
    for (const skill of skills) {
      skillMap.set(skill.name, skill);
    }
  }

  return [...skillMap.values()];
}

async function findSkillsInDir(dir: AbsolutePath): Promise<SkillInfo[]> {
  const exists = await pathExists(dir);
  if (!exists) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skills: SkillInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = absolutePathJoin(dir, entry.name);
    const skillFile = path.join(skillDir, "SKILL.md");

    let raw: string;
    try {
      raw = await fs.readFile(skillFile, "utf8");
    } catch {
      continue;
    }

    const parsed = parseFrontmatter(raw);
    if (!parsed) {
      continue;
    }

    skills.push({
      content: parsed.body,
      description: parsed.description,
      // Folder name is used as the skill identifier because it's guaranteed unique within the registry.
      name: entry.name,
      skillDir,
    });
  }

  return skills;
}

function parseFrontmatter(
  raw: string,
): null | { body: string; description: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) {
    return null;
  }

  const frontmatter = match[1];
  const bodyRaw = match[2];

  if (!frontmatter || bodyRaw === undefined) {
    return null;
  }

  const body = bodyRaw.trim();

  const descriptionMatch = /^description:[ \t]*(\S[^\n]*)$/m.exec(frontmatter);
  const description = descriptionMatch?.[1]?.trim();

  if (!description) {
    return null;
  }

  return { body, description };
}
