import { execa } from "execa";
import path from "node:path";
import readline from "node:readline/promises";

import { createAppConfig } from "../src/lib/app-config/create";
import { getProjects } from "../src/lib/get-apps";
import { Store } from "../src/lib/store";
import { WorkspaceDirSchema } from "../src/schemas/paths";
import { type WorkspaceConfig } from "../src/types";

const workspaceDir = process.argv[2];

if (!workspaceDir) {
  throw new Error("Usage: pnpm run script:dump-sessions <workspace-directory>");
}

const absoluteWorkspaceDir = path.resolve(workspaceDir);
const projectsDir = path.join(absoluteWorkspaceDir, "projects");

const workspaceConfig: WorkspaceConfig = {
  captureEvent: () => {
    return;
  },
  captureException: () => {
    return;
  },
  getAIProviderConfigs: () => [],
  nodeExecEnv: {},
  pnpmBinPath: WorkspaceDirSchema.parse("/usr/bin/pnpm"),
  previewsDir: WorkspaceDirSchema.parse(
    path.join(absoluteWorkspaceDir, "previews"),
  ),
  projectsDir: WorkspaceDirSchema.parse(projectsDir),
  registryDir: WorkspaceDirSchema.parse("/tmp/registry"),
  rootDir: WorkspaceDirSchema.parse(absoluteWorkspaceDir),
  trashItem: () => Promise.resolve(),
};

const { projects } = await getProjects(workspaceConfig, {
  direction: "desc",
  sortBy: "updatedAt",
});

if (projects.length === 0) {
  throw new Error("No projects found in workspace");
}

process.stdout.write("\nSelect a project:\n\n");

for (const [index, project] of projects.entries()) {
  const updatedDate = project.updatedAt.toLocaleDateString();
  process.stdout.write(
    `  ${index + 1}. ${project.title} (${project.folderName}) - Updated: ${updatedDate}\n`,
  );
}

process.stdout.write("\nEnter project number: ");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const answer = await rl.question("");
rl.close();

const selectedIndex = Number.parseInt(answer.trim(), 10) - 1;

if (
  Number.isNaN(selectedIndex) ||
  selectedIndex < 0 ||
  selectedIndex >= projects.length
) {
  throw new Error("Invalid selection");
}

const selectedProject = projects[selectedIndex];

if (!selectedProject) {
  throw new Error("Invalid selection");
}

process.stdout.write(`\nLoading sessions for ${selectedProject.title}...\n`);

const appConfig = createAppConfig({
  subdomain: selectedProject.subdomain,
  workspaceConfig,
});

const sessionIdsResult = await Store.getStoreId(appConfig);

if (sessionIdsResult.isErr()) {
  throw new Error(
    `Error getting session IDs: ${sessionIdsResult.error.message}`,
  );
}

const sessionIds = sessionIdsResult.value;

process.stdout.write(`Found ${sessionIds.length} sessions. Loading...\n`);

const sessions = [];

for (const sessionId of sessionIds) {
  const sessionResult = await Store.getSessionWithMessagesAndParts(
    sessionId,
    appConfig,
  );

  if (sessionResult.isErr()) {
    throw new Error(
      `Error getting session ${sessionId}: ${sessionResult.error.message}`,
    );
  }

  sessions.push(sessionResult.value);
}

const jsonOutput = JSON.stringify(sessions, null, 2);

execa`pbcopy`.stdin.end(jsonOutput);

process.stdout.write(`\n✓ Copied ${sessions.length} sessions to clipboard!\n`);
