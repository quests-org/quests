import { defineCommand } from "just-bash";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";

import {
  type FormatOptions,
  formatOutput,
  type OutputMode,
} from "./sqlite3-formatters";

export const SQLITE3_COMMAND = {
  description: "Run SQL queries against a SQLite database file.",
  name: "sqlite3",
} as const;

const DEFAULT_TIMEOUT_MS = 5000;

type ParseResult =
  | {
      database: null | string;
      options: SqliteOptions;
      showVersion: boolean;
      sql: null | string;
    }
  | { exitCode: number; stderr: string; stdout: string };

interface SqliteOptions {
  bail: boolean;
  cmd: null | string;
  echo: boolean;
  header: boolean;
  mode: OutputMode;
  newline: string;
  nullValue: string;
  readonly: boolean;
  separator: string;
}

type StatementResult =
  | { columns: string[]; rows: unknown[][]; type: "data" }
  | { error: string; type: "error" };

interface WorkerError {
  error: string;
  success: false;
  token: string;
}

interface WorkerInput {
  abortSab: SharedArrayBuffer;
  dbPath: null | string;
  options: { bail: boolean; echo: boolean };
  sql: string;
  token: string;
}

type WorkerOutput = WorkerError | WorkerSuccess;

interface WorkerSuccess {
  dbModified: boolean;
  results: StatementResult[];
  success: true;
  token: string;
}

function parseArgs(args: string[]): ParseResult {
  const options: SqliteOptions = {
    bail: false,
    cmd: null,
    echo: false,
    header: false,
    mode: "list",
    newline: "\n",
    nullValue: "",
    readonly: false,
    separator: "|",
  };

  let database: null | string = null;
  let sql: null | string = null;
  let showVersion = false;
  let endOfOptions = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";

    if (endOfOptions) {
      if (database === null) {
        database = arg;
      } else {
        sql ??= arg;
      }
      continue;
    }

    const nextArg = (): null | string => args[++i] ?? null;

    switch (arg) {
      case "--": {
        endOfOptions = true;
        break;
      }
      case "--help":
      case "-help": {
        return {
          exitCode: 0,
          stderr: "",
          stdout:
            [
              "Usage: sqlite3 [OPTIONS] DATABASE [SQL]",
              "",
              "Options:",
              "  -list           output in list mode (default)",
              "  -csv            output in CSV mode",
              "  -json           output in JSON mode",
              "  -line           output in line mode",
              "  -column         output in column mode",
              "  -table          output as ASCII table",
              "  -markdown       output as markdown table",
              "  -tabs           output in tab-separated mode",
              "  -box            output in Unicode box mode",
              "  -quote          output in SQL quote mode",
              "  -html           output as HTML table",
              "  -ascii          output in ASCII mode",
              "  -header         show column headers",
              "  -noheader       hide column headers",
              "  -separator SEP  field separator for list mode (default: |)",
              "  -newline SEP    row separator (default: \\n)",
              "  -nullvalue TEXT text for NULL values (default: empty)",
              "  -readonly       open database read-only",
              "  -bail           stop on first error",
              "  -echo           print SQL before execution",
              "  -cmd COMMAND    run SQL command before main SQL",
              "  -version        show SQLite version",
            ].join("\n") + "\n",
        };
      }
      case "-ascii": {
        options.mode = "ascii";
        break;
      }
      case "-bail": {
        options.bail = true;
        break;
      }
      case "-box": {
        options.mode = "box";
        break;
      }
      case "-cmd": {
        const val = nextArg();
        if (val === null) {
          return {
            exitCode: 1,
            stderr: "sqlite3: Error: missing argument to -cmd\n",
            stdout: "",
          };
        }
        options.cmd = val;
        break;
      }
      case "-column": {
        options.mode = "column";
        break;
      }
      case "-csv": {
        options.mode = "csv";
        break;
      }
      case "-echo": {
        options.echo = true;
        break;
      }
      case "-header": {
        options.header = true;
        break;
      }
      case "-html": {
        options.mode = "html";
        break;
      }
      case "-json": {
        options.mode = "json";
        break;
      }
      case "-line": {
        options.mode = "line";
        break;
      }
      case "-list": {
        options.mode = "list";
        break;
      }
      case "-markdown": {
        options.mode = "markdown";
        break;
      }
      case "-newline": {
        const val = nextArg();
        if (val === null) {
          return {
            exitCode: 1,
            stderr: "sqlite3: Error: missing argument to -newline\n",
            stdout: "",
          };
        }
        options.newline = val;
        break;
      }
      case "-noheader": {
        options.header = false;
        break;
      }
      case "-nullvalue": {
        const val = nextArg();
        if (val === null) {
          return {
            exitCode: 1,
            stderr: "sqlite3: Error: missing argument to -nullvalue\n",
            stdout: "",
          };
        }
        options.nullValue = val;
        break;
      }
      case "-quote": {
        options.mode = "quote";
        break;
      }
      case "-readonly": {
        options.readonly = true;
        break;
      }
      case "-separator": {
        const val = nextArg();
        if (val === null) {
          return {
            exitCode: 1,
            stderr: "sqlite3: Error: missing argument to -separator\n",
            stdout: "",
          };
        }
        options.separator = val;
        break;
      }
      case "-table": {
        options.mode = "table";
        break;
      }
      case "-tabs": {
        options.mode = "tabs";
        break;
      }
      case "-version": {
        showVersion = true;
        break;
      }
      default: {
        if (arg.startsWith("-")) {
          const optName = arg.startsWith("--") ? arg.slice(1) : arg;
          return {
            exitCode: 1,
            stderr: `sqlite3: Error: unknown option: ${optName}\nUse -help for a list of options.\n`,
            stdout: "",
          };
        }
        if (database === null) {
          database = arg;
        } else {
          sql ??= arg;
        }
      }
    }
  }

  return { database, options, showVersion, sql };
}

function tryUnlink(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // best-effort cleanup
  }
}

// Worker script executed inline via eval mode - no on-disk file needed.
// Uses node:sqlite (synchronous) with a SharedArrayBuffer abort flag for
// cooperative cancellation on recursive CTEs and long-running queries.
const WORKER_SCRIPT = /* js */ `
const { workerData, parentPort } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      current += char;
      if (char === stringChar) {
        if (sql[i + 1] === stringChar) { current += sql[++i]; }
        else { inString = false; }
      }
    } else if (char === "'" || char === '"') {
      current += char; inString = true; stringChar = char;
    } else if (char === ';') {
      const stmt = current.trim(); if (stmt) statements.push(stmt); current = '';
    } else { current += char; }
  }
  const stmt = current.trim(); if (stmt) statements.push(stmt);
  return statements;
}

function isWriteStatement(sql) {
  const upper = sql.trimStart().toUpperCase();
  return upper.startsWith('INSERT') || upper.startsWith('UPDATE') ||
    upper.startsWith('DELETE') || upper.startsWith('CREATE') ||
    upper.startsWith('DROP') || upper.startsWith('ALTER') ||
    upper.startsWith('REPLACE') || upper.startsWith('VACUUM');
}

const { dbPath, sql, options, token, abortSab } = workerData;
const abortFlag = new Int32Array(abortSab);

let db;
try {
  db = new DatabaseSync(dbPath ?? ':memory:');
} catch(e) {
  parentPort.postMessage({ success: false, error: e.message, token });
  process.exit(0);
}

db.function('_q_abort', () => {
  if (Atomics.load(abortFlag, 0) === 1) throw new Error('Query timed out');
  return null;
});

const results = [];
let dbModified = false;

try {
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    if (Atomics.load(abortFlag, 0) === 1) {
      results.push({ type: 'error', error: 'Query timed out' });
      break;
    }
    try {
      const prepared = db.prepare(stmt);
      if (isWriteStatement(stmt)) {
        const runResult = prepared.run();
        if (runResult.changes > 0) dbModified = true;
        results.push({ type: 'data', columns: [], rows: [] });
      } else {
        prepared.setReturnArrays(true);
        const colInfo = prepared.columns();
        const columns = colInfo.map(c => c.name);
        const rows = prepared.all();
        results.push({ type: 'data', columns, rows });
      }
    } catch(e) {
      results.push({ type: 'error', error: e.message });
      if (options.bail) break;
    }
  }
  db.close();
  parentPort.postMessage({ success: true, results, dbModified, token });
} catch(e) {
  try { db.close(); } catch(_) {}
  parentPort.postMessage({ success: false, error: e.message, token });
}
`;

export function createSqlite3Command() {
  return defineCommand(SQLITE3_COMMAND.name, async (args, ctx) => {
    const parsed = parseArgs(args);

    if ("exitCode" in parsed) {
      return parsed;
    }

    const { database, options, showVersion, sql: sqlArg } = parsed;

    if (showVersion) {
      // Spin up a quick in-memory query for the version string
      const abortSab = new SharedArrayBuffer(4);
      const token = randomBytes(8).toString("hex");
      const result = await runInWorker(
        {
          abortSab,
          dbPath: null,
          options: { bail: false, echo: false },
          sql: "SELECT sqlite_version()",
          token,
        },
        2000,
      );
      if (
        result.success &&
        result.results[0]?.type === "data" &&
        result.results[0].rows[0]
      ) {
        return {
          exitCode: 0,
          stderr: "",
          stdout: `${String(result.results[0].rows[0][0])}\n`,
        };
      }
      return { exitCode: 0, stderr: "", stdout: "unknown\n" };
    }

    if (!database) {
      return {
        exitCode: 1,
        stderr: "sqlite3: missing database argument\n",
        stdout: "",
      };
    }

    let sql = sqlArg ?? ctx.stdin.trim();
    if (options.cmd) {
      sql = options.cmd + (sql ? `; ${sql}` : "");
    }
    if (!sql) {
      return { exitCode: 1, stderr: "sqlite3: no SQL provided\n", stdout: "" };
    }

    const isMemory = database === ":memory:";
    let tmpFile: null | string = null;
    let dbPath: null | string = null;

    try {
      if (!isMemory) {
        const virtualPath = ctx.fs.resolvePath(ctx.cwd, database);
        tmpFile = path.join(
          os.tmpdir(),
          `qs-sqlite3-${process.pid}-${randomBytes(6).toString("hex")}.db`,
        );

        // If the virtual FS has an existing DB, write it to the temp file.
        if (await ctx.fs.exists(virtualPath)) {
          const buf = await ctx.fs.readFileBuffer(virtualPath);
          fs.writeFileSync(tmpFile, buf);
        }
        dbPath = tmpFile;
      }
    } catch (error) {
      if (tmpFile) {
        tryUnlink(tmpFile);
      }
      const msg = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stderr: `sqlite3: unable to open database "${database}": ${msg}\n`,
        stdout: "",
      };
    }

    const timeoutMs = ctx.limits?.maxSqliteTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const token = randomBytes(8).toString("hex");
    const abortSab = new SharedArrayBuffer(4);

    let result: WorkerOutput;
    try {
      result = await runInWorker(
        {
          abortSab,
          dbPath,
          options: { bail: options.bail, echo: options.echo },
          sql,
          token,
        },
        timeoutMs,
      );
    } catch (error) {
      if (tmpFile) {
        tryUnlink(tmpFile);
      }
      const msg = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stderr: `sqlite3: worker error: ${msg}\n`,
        stdout: "",
      };
    }

    if (!result.success) {
      if (tmpFile) {
        tryUnlink(tmpFile);
      }
      return { exitCode: 1, stderr: `sqlite3: ${result.error}\n`, stdout: "" };
    }

    // Write modified DB back to virtual FS
    if (
      result.dbModified &&
      !options.readonly &&
      !isMemory &&
      tmpFile &&
      dbPath
    ) {
      try {
        const virtualPath = ctx.fs.resolvePath(ctx.cwd, database);
        const written = fs.readFileSync(tmpFile);
        await ctx.fs.writeFile(virtualPath, written);
      } catch (error) {
        if (tmpFile) {
          tryUnlink(tmpFile);
        }
        const msg = error instanceof Error ? error.message : String(error);
        return {
          exitCode: 1,
          stderr: `sqlite3: failed to write database: ${msg}\n`,
          stdout: "",
        };
      }
    }

    if (tmpFile) {
      tryUnlink(tmpFile);
    }

    const formatOptions: FormatOptions = {
      header: options.header,
      mode: options.mode,
      newline: options.newline,
      nullValue: options.nullValue,
      separator: options.separator,
    };

    let stdout = "";
    if (options.echo) {
      stdout += `${sql}\n`;
    }

    let hadError = false;
    for (const stmtResult of result.results) {
      if (stmtResult.type === "error") {
        if (options.bail) {
          return {
            exitCode: 1,
            stderr: `Error: ${stmtResult.error}\n`,
            stdout,
          };
        }
        stdout += `Error: ${stmtResult.error}\n`;
        hadError = true;
      } else if (
        (stmtResult.rows.length > 0 || options.header)
      ) {
        stdout += formatOutput(
          stmtResult.columns,
          stmtResult.rows,
          formatOptions,
        );
      }
    }

    return { exitCode: hadError && options.bail ? 1 : 0, stderr: "", stdout };
  });
}

function runInWorker(
  input: WorkerInput,
  timeoutMs: number,
): Promise<WorkerOutput> {
  return new Promise((resolve) => {
    const abortFlag = new Int32Array(input.abortSab);

    const worker = new Worker(WORKER_SCRIPT, {
      eval: true,
      workerData: input,
    });

    const timer = setTimeout(() => {
      Atomics.store(abortFlag, 0, 1);
      // Give the worker a chance to exit gracefully via the abort flag,
      // then force-terminate after a short grace period.
      void setTimeout(() => { void worker.terminate(); }, 500);
      resolve({
        error: `Query timed out after ${timeoutMs}ms`,
        success: false,
        token: input.token,
      });
    }, timeoutMs);

    worker.on("message", (msg: unknown) => {
      clearTimeout(timer);
      const out = msg as WorkerOutput;
      if (out.token === input.token) {
        resolve(out);
      } else {
        resolve({
          error: "Worker protocol error",
          success: false,
          token: input.token,
        });
      }
    });

    worker.on("error", (err) => {
      clearTimeout(timer);
      resolve({ error: err.message, success: false, token: input.token });
    });

    worker.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          error: `Worker exited with code ${code}`,
          success: false,
          token: input.token,
        });
      }
    });
  });
}
