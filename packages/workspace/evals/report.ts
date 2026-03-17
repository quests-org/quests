import fs from "node:fs/promises";
import path from "node:path";

import { createAppConfig } from "../src/lib/app-config/create";
import { getProjects } from "../src/lib/get-apps";
import { getMigratedProjectState } from "../src/lib/project-state-store";
import { sessionToMarkdown } from "../src/lib/session-to-markdown";
import { Store } from "../src/lib/store";
import { getProjectUsageSummary } from "../src/lib/usage-summary";
import { type Session } from "../src/schemas/session";
import { type StoreId } from "../src/schemas/store-id";
import { type AssertionResult, type EvalCase } from "./harness";
import { buildReportWorkspaceConfig } from "./utils";

interface RollupSummary {
  assertions: {
    failed: number;
    pass_rate: number;
    passed: number;
    total: number;
  };
  modelURIs: string[];
  projects: number;
}

export async function generateReport({
  evalCases = [],
  includeContextMessages = false,
  outputDir,
  workspaceRootDir,
}: {
  evalCases?: EvalCase[];
  includeContextMessages?: boolean;
  outputDir: string;
  workspaceRootDir: string;
}): Promise<RollupSummary> {
  const evalCasesByName = new Map(evalCases.map((e) => [e.name, e]));
  const absoluteWorkspaceDir = path.resolve(workspaceRootDir);
  const workspaceConfig = buildReportWorkspaceConfig(absoluteWorkspaceDir);

  const { projects } = await getProjects(workspaceConfig, {
    direction: "asc",
    sortBy: "createdAt",
  });

  if (projects.length === 0) {
    process.stdout.write("No projects found in workspace.\n");
    return {
      assertions: { failed: 0, pass_rate: 0, passed: 0, total: 0 },
      modelURIs: [],
      projects: 0,
    };
  }

  process.stdout.write(
    `Generating report for ${projects.length} project(s)...\n`,
  );

  let rollupPassed = 0;
  let rollupFailed = 0;
  const rollupModelURIs = new Set<string>();

  for (const project of projects) {
    const appConfig = createAppConfig({
      subdomain: project.subdomain,
      workspaceConfig,
    });

    const projectState = await getMigratedProjectState({
      appDir: appConfig.appDir,
      captureException: workspaceConfig.captureException,
      configs: workspaceConfig.getAIProviderConfigs(),
    });
    const projectModelURI = projectState.selectedModelURI;
    if (projectModelURI) {
      rollupModelURIs.add(projectModelURI);
    }

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

    const evalCase =
      evalCasesByName.get(project.folderName) ??
      [...evalCasesByName.entries()].find(([name]) =>
        project.folderName.endsWith(`-${name}`),
      )?.[1];
    await fs.writeFile(
      path.join(projectOutputDir, "eval-case.json"),
      JSON.stringify(
        { modelURI: projectModelURI, name: project.folderName },
        null,
        2,
      ),
      "utf8",
    );

    if (evalCase?.assertions && evalCase.assertions.length > 0) {
      const sessions = [...sessionMap.values()];
      const assertionResults: AssertionResult[] = await Promise.all(
        evalCase.assertions.map((a) => a.check({ appConfig, sessions })),
      );
      const passed = assertionResults.filter((r) => r.passed).length;
      const failed = assertionResults.filter((r) => !r.passed).length;
      const total = assertionResults.length;
      rollupPassed += passed;
      rollupFailed += failed;

      const assertionsOutput = {
        assertion_results: assertionResults,
        summary: {
          failed,
          pass_rate: total > 0 ? passed / total : 0,
          passed,
          total,
        },
      };
      await fs.writeFile(
        path.join(projectOutputDir, "assertions.json"),
        JSON.stringify(assertionsOutput, null, 2),
        "utf8",
      );

      const lines = assertionResults.map((r) => {
        const icon = r.passed ? "✓" : "✗";
        return `    ${icon} ${r.text} — ${r.evidence}`;
      });
      process.stdout.write(
        `  [${project.folderName}] ${passed}/${total} assertions passed\n${lines.join("\n")}\n`,
      );
    } else {
      process.stdout.write(`  [${project.folderName}]\n`);
    }
  }

  const rollupTotal = rollupPassed + rollupFailed;
  const rollup: RollupSummary = {
    assertions: {
      failed: rollupFailed,
      pass_rate: rollupTotal > 0 ? rollupPassed / rollupTotal : 0,
      passed: rollupPassed,
      total: rollupTotal,
    },
    modelURIs: [...rollupModelURIs],
    projects: projects.length,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "summary.json"),
    JSON.stringify(rollup, null, 2),
    "utf8",
  );

  return rollup;
}
