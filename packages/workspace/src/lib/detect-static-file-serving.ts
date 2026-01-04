import fs from "node:fs/promises";

import { APP_FOLDER_NAMES } from "../constants";
import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

const SERVER_INDEX_PATH = "src/server/index.ts";

const POSSIBLE_SERVED_FOLDERS = [
  APP_FOLDER_NAMES.output,
  APP_FOLDER_NAMES.uploads,
] as const;

type PossibleServedFolder = (typeof POSSIBLE_SERVED_FOLDERS)[number];

export function buildStaticFileServingInstructions(
  servedFolders: PossibleServedFolder[],
) {
  if (servedFolders.length === 0) {
    return "";
  }

  const folderInstructions = servedFolders
    .map((folderName) => {
      return `- Files in \`./${folderName}/\` are served at \`/${folderName}/*\` (e.g., \`/${folderName}/image.png\`)`;
    })
    .join("\n");

  return `## Static File Serving
The server serves static files from specific directories, making them accessible to code running in the \`${APP_FOLDER_NAMES.src}/\` directory:
${folderInstructions}`;
}

export async function detectStaticFileServing(appDir: AbsolutePath) {
  const serverIndexPath = absolutePathJoin(appDir, SERVER_INDEX_PATH);

  const exists = await pathExists(serverIndexPath);
  if (!exists) {
    return [];
  }

  try {
    const content = await fs.readFile(serverIndexPath, "utf8");

    const servedFolders: PossibleServedFolder[] = [];
    for (const folderName of POSSIBLE_SERVED_FOLDERS) {
      if (hasServeStaticForFolder(content, folderName)) {
        servedFolders.push(folderName);
      }
    }

    return servedFolders;
  } catch {
    return [];
  }
}

function hasServeStaticForFolder(
  content: string,
  folderName: PossibleServedFolder,
): boolean {
  // A very basic check looking for Hono's serveStatic middleware
  // e.g. app.use("/uploads/*", serveStatic({ root: "./" }));
  return content.includes("serveStatic") && content.includes(folderName);
}
