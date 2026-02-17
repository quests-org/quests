import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { type AgentName, RETRIEVAL_AGENT_NAME } from "../agents/types";
import { type FolderAttachment } from "../schemas/folder-attachment";
import { type AbsolutePath, AbsolutePathSchema } from "../schemas/paths";
import { Task } from "../tools/task";
import { absolutePathJoin } from "./absolute-path-join";
import { ensureRelativePath } from "./ensure-relative-path";
import { executeError } from "./execute-error";
import { normalizePath } from "./normalize-path";
import { pathExists } from "./path-exists";
import { validateAttachedFolderPath } from "./validate-attached-folder-path";

export async function getSimilarPathSuggestions({
  absolutePath,
  agentName,
  displayPath,
}: {
  absolutePath: AbsolutePath;
  agentName: AgentName;
  displayPath: string;
}) {
  try {
    const dir = path.dirname(absolutePath);
    const dirAsAbsolute = AbsolutePathSchema.parse(dir);
    const dirExists = await pathExists(dirAsAbsolute);

    if (!dirExists) {
      return [];
    }

    const base = path.basename(absolutePath);
    const baseWithoutExt = path.parse(base).name;
    const dirEntries = await fs.readdir(dir);

    const suggestions = dirEntries
      .filter((entry) => {
        const entryWithoutExt = path.parse(entry).name;
        return (
          entry.toLowerCase().includes(base.toLowerCase()) ||
          base.toLowerCase().includes(entry.toLowerCase()) ||
          entryWithoutExt.toLowerCase() === baseWithoutExt.toLowerCase()
        );
      })
      .map((entry) => {
        if (agentName === "retrieval") {
          // For retrieval agent, return absolute paths
          return path.join(dir, entry);
        }
        // For normal agent, return relative paths
        return normalizePath(path.join(path.dirname(displayPath), entry));
      })
      .slice(0, 3);

    return suggestions;
  } catch {
    return [];
  }
}

export function resolveAgentPath(options: {
  agentName: AgentName;
  appDir: AbsolutePath;
  attachedFolders?: Record<string, FolderAttachment.Type>;
  inputPath?: string;
  isRequired?: boolean;
}) {
  const {
    agentName,
    appDir,
    attachedFolders,
    inputPath,
    isRequired = true,
  } = options;

  // Retrieval agent ALWAYS requires a path - it cannot operate in the current folder
  if (agentName === "retrieval") {
    if (!inputPath?.trim()) {
      const folderList = attachedFolders
        ? Object.values(attachedFolders)
            .map((f) => `  - ${f.name}: ${f.path}`)
            .join("\n")
        : "";
      const message = folderList
        ? `Must specify a path parameter. Available folders:\n${folderList}`
        : "Must specify an absolute path to an attached folder";
      return executeError(message);
    }

    const trimmedPath = inputPath.trim();
    const pathResult = attachedFolders
      ? validateAttachedFolderPath(trimmedPath, attachedFolders)
      : executeError("No attached folders available");

    if (pathResult.isErr()) {
      return pathResult;
    }
    return ok({
      absolutePath: pathResult.value,
      displayPath: trimmedPath,
    });
  }

  // Non-retrieval agents: handle optional paths
  if (!inputPath?.trim()) {
    if (!isRequired) {
      return ok({
        absolutePath: appDir,
        displayPath: "./",
      });
    }
    return executeError("Path is required but was not provided");
  }

  const trimmedPath = inputPath.trim();

  if (path.isAbsolute(trimmedPath) && attachedFolders) {
    const matchingFolder = Object.values(attachedFolders).find((folder) =>
      trimmedPath.startsWith(folder.path),
    );
    if (matchingFolder) {
      return executeError(
        `The path "${trimmedPath}" is within the attached folder "${matchingFolder.name}". ` +
          `Use the ${Task.name} tool with subagent_type "${RETRIEVAL_AGENT_NAME}" to access files from attached folders.`,
      );
    }
  }

  const fixedPathResult = ensureRelativePath(trimmedPath);
  if (fixedPathResult.isErr()) {
    return fixedPathResult;
  }
  const fixedPath = fixedPathResult.value;

  return ok({
    absolutePath: absolutePathJoin(appDir, fixedPath),
    displayPath: fixedPath,
  });
}
