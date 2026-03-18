import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";

import { EVALS } from "./cases";
import { MODELS, runEvals } from "./harness";
import { generateReport } from "./report";
import { c } from "./utils";

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
      `${c.dim}┌─ Eval Results ──────────────────────────────────────${c.reset}`,
      `${c.dim}│${c.reset}  ${c.dim}Workspace  :${c.reset} ${workspaceRootDir}`,
      `${c.dim}│${c.reset}  ${c.dim}Results    :${c.reset} ${relativeOutputDir}`,
      ...(rollup.modelURIs.length > 0
        ? rollup.modelURIs.map(
            (m, i) =>
              `${c.dim}│${c.reset}  ${c.dim}${i === 0 ? "Models     " : "           "} :${c.reset} ${c.cyan}${m}${c.reset}`,
          )
        : []),
      `${c.dim}│${c.reset}  ${c.dim}Projects   :${c.reset} ${c.yellow}${rollup.projects}${c.reset}`,
      ...(assertions.total > 0
        ? [
            `${c.dim}│${c.reset}  ${c.dim}Assertions :${c.reset} ${assertions.passed === assertions.total ? c.green : c.yellow}${assertions.passed}/${assertions.total} passed (${passRate})${c.reset}`,
          ]
        : []),
      `${c.dim}└─────────────────────────────────────────────────────${c.reset}`,
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

  const totalRuns = filteredEvals.length * MODELS.length;

  process.stdout.write(
    [
      "",
      `${c.dim}┌─ Eval Plan ─────────────────────────────────────────${c.reset}`,
      `${c.dim}│${c.reset}  ${c.dim}Evals       :${c.reset} ${c.yellow}${filteredEvals.length}${c.reset}`,
      `${c.dim}│${c.reset}  ${c.dim}Models      :${c.reset} ${c.yellow}${MODELS.length}${c.reset}`,
      `${c.dim}│${c.reset}  ${c.dim}Total runs  :${c.reset} ${c.yellow}${totalRuns}${c.reset}`,
      `${c.dim}│${c.reset}  ${c.dim}Concurrency :${c.reset} ${concurrency}`,
      `${c.dim}│${c.reset}  ${c.dim}Dry run     :${c.reset} ${dryRun ? "yes" : "no"}`,
      `${c.dim}├─────────────────────────────────────────────────────${c.reset}`,
      ...filteredEvals.map(
        (e) => `${c.dim}│${c.reset}  ${c.dim}-${c.reset} ${e.name}`,
      ),
      `${c.dim}├─────────────────────────────────────────────────────${c.reset}`,
      ...MODELS.map(
        (m) =>
          `${c.dim}│${c.reset}  ${c.dim}-${c.reset} ${c.cyan}${m}${c.reset}`,
      ),
      `${c.dim}└─────────────────────────────────────────────────────${c.reset}`,
      "",
    ].join("\n"),
  );

  if (!dryRun) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question("Proceed? (y/N) ");
    rl.close();
    if (answer.toLowerCase() !== "y") {
      process.stdout.write("Aborted.\n");
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(0);
    }
    process.stdout.write("\n");
  }

  const { workspaceRootDir } = await runEvals(filteredEvals, {
    concurrency,
    dryRun,
  });

  if (!dryRun) {
    process.stdout.write(
      `\n${c.green}All evals complete.${c.reset} ${c.dim}Generating report...${c.reset}\n`,
    );

    const rollup = await generateReport({
      evalCases: filteredEvals,
      includeContextMessages,
      outputDir,
      workspaceRootDir,
    });

    printSummary({ outputDir, rollup, workspaceRootDir });
  }
}
