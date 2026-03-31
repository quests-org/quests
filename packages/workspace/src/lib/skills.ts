import matter from "@11ty/gray-matter";
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

export function parseFrontmatter(
  raw: string,
): null | { body: string; description: string } {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch {
    try {
      parsed = matter(sanitizeFrontmatter(raw));
    } catch {
      return null;
    }
  }

  const description =
    typeof parsed.data.description === "string"
      ? parsed.data.description.trim()
      : undefined;
  if (!description) {
    return null;
  }

  return { body: parsed.content.trim(), description };
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

// Adapted from https://github.com/sst/opencode/blob/main/packages/opencode/src/config/markdown.ts
function sanitizeFrontmatter(raw: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match?.[1]) {
    return raw;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);
  const result: string[] = [];

  for (const line of lines) {
    if (
      line.trim().startsWith("#") ||
      line.trim() === "" ||
      /^\s+/.test(line)
    ) {
      result.push(line);
      continue;
    }

    const kvMatch = /^(\w+):(.*)$/.exec(line);
    if (!kvMatch?.[1] || kvMatch[2] === undefined) {
      result.push(line);
      continue;
    }

    const key = kvMatch[1];
    const value = kvMatch[2].trim();

    if (
      value === "" ||
      value === ">" ||
      value === "|" ||
      value.startsWith('"') ||
      value.startsWith("'")
    ) {
      result.push(line);
      continue;
    }

    if (value.includes(":")) {
      result.push(`${key}: |-\n  ${value}`);
      continue;
    }

    result.push(line);
  }

  return raw.replace(frontmatter, () => result.join("\n"));
}
