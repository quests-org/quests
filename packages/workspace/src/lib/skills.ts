import fs from "node:fs/promises";
import path from "node:path";

import { REGISTRY_FOLDER_NAMES } from "../constants";
import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

export const FILE_LIST_LIMIT = 50;

interface SkillInfo {
  content: string;
  description: string;
  name: string;
  skillDir: AbsolutePath;
}

export async function findSkill(
  registryDir: AbsolutePath,
  name: string,
): Promise<{ all: SkillInfo[]; skill: SkillInfo | undefined }> {
  const sources = getSkillSources(registryDir);
  const all = await findSkills(sources);
  return { all, skill: all.find((s) => s.name === name) };
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

export function getSkillSources(registryDir: AbsolutePath): AbsolutePath[] {
  return [absolutePathJoin(registryDir, REGISTRY_FOLDER_NAMES.skills)];
}

export async function listSkillFiles(
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
