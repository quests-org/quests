import path from "node:path";
import { parseArgs } from "node:util";

import { runEvals } from "./harness";
import { EVALS } from "./index";
import { generateReport } from "./report";

// Suppress unstorage db0 experimental warning
// https://github.com/unjs/unstorage/blob/main/src/drivers/db0.ts
(
  globalThis as unknown as Record<string, boolean>
).__unstorage_db0_experimental_warning__ = true;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "include-context": { default: false, type: "boolean" },
  },
});

const subcommand = positionals[0];
const includeContextMessages = values["include-context"];

if (subcommand !== "run" && subcommand !== "report") {
  process.stderr.write(
    "Usage: tsx evals/run.ts <run|report> [workspace-dir]\n",
  );
  process.stderr.write(
    "  run              Run all evals then generate report\n",
  );
  process.stderr.write(
    "  report <dir>     Generate report from an existing workspace dir\n",
  );
  throw new Error(`Unknown subcommand: "${subcommand ?? "(none)"}"`);
}

const timestamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const outputDir = path.resolve(
  import.meta.dirname,
  "..",
  "eval-results.local",
  timestamp,
);

function printSummary({
  outputDir: out,
  workspaceRootDir,
}: {
  outputDir: string;
  workspaceRootDir: string;
}) {
  const relativeOutputDir = `./${path.relative(process.cwd(), out)}`;
  process.stdout.write(
    [
      "",
      "┌─ Eval Results ──────────────────────────────────────",
      `│  Workspace : ${workspaceRootDir}`,
      `│  Results   : ${relativeOutputDir}`,
      "└─────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

if (subcommand === "report") {
  const workspaceRootDir = positionals[1];

  if (!workspaceRootDir) {
    process.stderr.write(
      "Error: report subcommand requires a workspace directory argument\n",
    );
    throw new Error(
      "report subcommand requires a workspace directory argument",
    );
  }

  const absoluteWorkspaceDir = path.resolve(workspaceRootDir);
  process.stdout.write(`Workspace: ${absoluteWorkspaceDir}\n`);

  await generateReport({
    includeContextMessages,
    outputDir,
    workspaceRootDir: absoluteWorkspaceDir,
  });

  printSummary({ outputDir, workspaceRootDir: absoluteWorkspaceDir });
} else {
  const { workspaceRootDir } = await runEvals(EVALS);

  process.stdout.write(`\nAll evals complete. Generating report...\n`);

  await generateReport({ includeContextMessages, outputDir, workspaceRootDir });

  printSummary({ outputDir, workspaceRootDir });
}
