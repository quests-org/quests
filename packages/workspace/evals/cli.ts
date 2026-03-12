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
    concurrency: { default: "8", type: "string" },
    "dry-run": { default: false, type: "boolean" },
    "include-context": { default: false, type: "boolean" },
  },
});

const subcommand = positionals[0];
const includeContextMessages = values["include-context"];
const dryRun = values["dry-run"];
const concurrency = Number.parseInt(values.concurrency, 10);
const nameFilter = positionals[1];

if (subcommand !== "run" && subcommand !== "report") {
  process.stderr.write("Usage: tsx evals/run.ts <run|report> [options]\n");
  process.stderr.write(
    "  run [pattern]    Run evals matching name pattern, then generate report\n",
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
  rollup,
  workspaceRootDir,
}: {
  outputDir: string;
  rollup: Awaited<ReturnType<typeof generateReport>>;
  workspaceRootDir: string;
}) {
  const relativeOutputDir = `./${path.relative(process.cwd(), out)}`;
  const { assertions } = rollup;
  const passRate =
    assertions.total > 0 ? `${Math.round(assertions.pass_rate * 100)}%` : "n/a";
  process.stdout.write(
    [
      "",
      "┌─ Eval Results ──────────────────────────────────────",
      `│  Workspace  : ${workspaceRootDir}`,
      `│  Results    : ${relativeOutputDir}`,
      ...(rollup.modelURIs.length > 0
        ? rollup.modelURIs.map(
            (m, i) => `│  ${i === 0 ? "Models     " : "           "} : ${m}`,
          )
        : []),
      `│  Projects   : ${rollup.projects}`,
      ...(assertions.total > 0
        ? [
            `│  Assertions : ${assertions.passed}/${assertions.total} passed (${passRate})`,
          ]
        : []),
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

  const rollup = await generateReport({
    evalCases: EVALS,
    includeContextMessages,
    outputDir,
    workspaceRootDir: absoluteWorkspaceDir,
  });

  printSummary({ outputDir, rollup, workspaceRootDir: absoluteWorkspaceDir });
} else {
  const filteredEvals = nameFilter
    ? EVALS.filter((e) =>
        e.name.toLowerCase().includes(nameFilter.toLowerCase()),
      )
    : EVALS;

  if (filteredEvals.length === 0) {
    process.stderr.write(`No evals matched pattern: "${nameFilter ?? ""}"\n`);
    throw new Error(`No evals matched pattern: "${nameFilter ?? ""}"`);
  }

  const { workspaceRootDir } = await runEvals(filteredEvals, {
    concurrency,
    dryRun,
  });

  if (!dryRun) {
    process.stdout.write(`\nAll evals complete. Generating report...\n`);

    const rollup = await generateReport({
      evalCases: filteredEvals,
      includeContextMessages,
      outputDir,
      workspaceRootDir,
    });

    printSummary({ outputDir, rollup, workspaceRootDir });
  }
}
