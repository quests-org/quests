import { err, ok, type Result } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { APP_FOLDER_NAMES } from "../constants";
import { type AbsolutePath, type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { TypedError } from "./errors";
import { getIgnore } from "./get-ignore";

export async function copySkill({
  appDir,
  signal,
  skillDir,
  skillName,
}: {
  appDir: AppDir;
  signal: AbortSignal;
  skillDir: AbsolutePath;
  skillName: string;
}): Promise<Result<AbsolutePath, TypedError.Conflict>> {
  const destDir = absolutePathJoin(
    appDir,
    APP_FOLDER_NAMES.agents,
    APP_FOLDER_NAMES.agentsSkills,
    skillName,
  );

  try {
    await fs.access(destDir);
    return err(
      new TypedError.Conflict(
        `Skill "${skillName}" is already loaded at ${path.join(APP_FOLDER_NAMES.agents, APP_FOLDER_NAMES.agentsSkills, skillName)}.`,
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(destDir, { recursive: true });
  const ignore = await getIgnore(appDir, { signal });
  await fs.cp(skillDir, destDir, {
    filter: (src) => {
      const relativePath = path.relative(skillDir, src);
      if (relativePath === "") {
        return true;
      }
      return !ignore.ignores(relativePath);
    },
    recursive: true,
  });
  return ok(destDir);
}
