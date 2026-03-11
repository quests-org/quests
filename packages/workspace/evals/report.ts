import fs from "node:fs/promises";
import path from "node:path";

import { createAppConfig } from "../src/lib/app-config/create";
import { getProjects } from "../src/lib/get-apps";
import { sessionToMarkdown } from "../src/lib/session-to-markdown";
import { Store } from "../src/lib/store";
import { getProjectUsageSummary } from "../src/lib/usage-summary";
import { type Session } from "../src/schemas/session";
import { type StoreId } from "../src/schemas/store-id";
import { buildReportWorkspaceConfig } from "./utils";

export async function generateReport({
  includeContextMessages = false,
  outputDir,
  workspaceRootDir,
}: {
  includeContextMessages?: boolean;
  outputDir: string;
  workspaceRootDir: string;
}): Promise<void> {
  const absoluteWorkspaceDir = path.resolve(workspaceRootDir);
  const workspaceConfig = buildReportWorkspaceConfig(absoluteWorkspaceDir);

  const { projects } = await getProjects(workspaceConfig, {
    direction: "asc",
    sortBy: "createdAt",
  });

  if (projects.length === 0) {
    process.stdout.write("No projects found in workspace.\n");
    return;
  }

  process.stdout.write(
    `Generating report for ${projects.length} project(s)...\n`,
  );

  for (const project of projects) {
    const appConfig = createAppConfig({
      subdomain: project.subdomain,
      workspaceConfig,
    });

    const sessionsResult = await Store.getSessions(appConfig, {
      includeChildSessions: true,
    });

    if (sessionsResult.isErr()) {
      process.stderr.write(
        `Error loading sessions for ${project.title}: ${sessionsResult.error.message}\n`,
      );
      continue;
    }

    const allSessions = sessionsResult.value;
    const rootSessions = allSessions.filter((s) => !s.parentId);

    if (rootSessions.length > 1) {
      process.stderr.write(
        `Warning: project "${project.title}" has ${rootSessions.length} root sessions (expected 1). Using the first one.\n`,
      );
    }

    const rootSession = rootSessions[0];
    if (!rootSession) {
      process.stderr.write(
        `Warning: project "${project.title}" has no root session, skipping.\n`,
      );
      continue;
    }

    // Load messages+parts for all sessions
    const sessionMap = new Map<StoreId.Session, Session.WithMessagesAndParts>();

    for (const session of allSessions) {
      const result = await Store.getSessionWithMessagesAndParts(
        session.id,
        appConfig,
      );
      if (result.isErr()) {
        process.stderr.write(
          `Error loading session ${session.id}: ${result.error.message}\n`,
        );
        continue;
      }
      sessionMap.set(session.id, result.value);
    }

    const rootSessionWithParts = sessionMap.get(rootSession.id);
    if (!rootSessionWithParts) {
      process.stderr.write(
        `Error: could not load root session for "${project.title}", skipping.\n`,
      );
      continue;
    }

    // Build child sessions map (exclude root)
    const childSessionsMap = new Map<
      StoreId.Session,
      Session.WithMessagesAndParts
    >();
    for (const [id, session] of sessionMap) {
      if (id !== rootSession.id) {
        childSessionsMap.set(id, session);
      }
    }

    const markdown = await sessionToMarkdown(
      rootSessionWithParts,
      childSessionsMap,
      { includeContextMessages },
    );

    const stats = await getProjectUsageSummary(appConfig);

    const projectOutputDir = path.join(outputDir, project.folderName);
    await fs.mkdir(projectOutputDir, { recursive: true });
    await fs.writeFile(
      path.join(projectOutputDir, "session.md"),
      markdown,
      "utf8",
    );
    await fs.writeFile(
      path.join(projectOutputDir, "stats.json"),
      JSON.stringify(stats, null, 2),
      "utf8",
    );
    const symlinkPath = path.join(projectOutputDir, "project");
    await fs.symlink(appConfig.appDir, symlinkPath).catch(() => {
      return;
    });

    process.stdout.write(`  [${project.title}]\n`);
  }
}
