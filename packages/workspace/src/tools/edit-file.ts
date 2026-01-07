/* eslint-disable unicorn/prefer-string-slice */
// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/edit.ts
// Kept as a single file for now so we can easily merge changes from upstream.
import ms from "ms";
import { err, ok } from "neverthrow";
import { dedent, sift } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { ensureRelativePath } from "../lib/ensure-relative-path";
import { executeError } from "../lib/execute-error";
import { pathExists } from "../lib/path-exists";
import { writeFileWithDir } from "../lib/write-file-with-dir";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { ReadFile } from "./read-file";
import { diagnosticsReminder } from "./run-diagnostics";

const MAX_FILE_SIZE = 250 * 1024; // 250KB

const INPUT_PARAMS = {
  filePath: "filePath",
  newString: "newString",
  oldString: "oldString",
  replaceAll: "replaceAll",
} as const;

type Replacer = (
  content: string,
  find: string,
) => Generator<string, void, unknown>;

// Similarity thresholds for block anchor fallback matching
const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0;
const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3;

/**
 * Levenshtein distance algorithm implementation
 */
function levenshtein(a: string, b: string): number {
  // Handle empty strings
  if (a === "" || b === "") {
    return Math.max(a.length, b.length);
  }
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_2, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const matrixRow = matrix[i];
      const prevMatrixRow = matrix[i - 1];
      if (matrixRow && prevMatrixRow) {
        matrixRow[j] = Math.min(
          (matrixRow[j - 1] ?? 0) + 1,
          (prevMatrixRow[j] ?? 0) + 1,
          (prevMatrixRow[j - 1] ?? 0) + cost,
        );
      }
    }
  }
  const lastRow = matrix[a.length];
  return lastRow?.[b.length] ?? 0;
}

const SimpleReplacer: Replacer = function* (_content, find) {
  yield find;
};

const LineTrimmedReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n");
  const searchLines = find.split("\n");

  if (searchLines.at(-1) === "") {
    searchLines.pop();
  }

  for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
    let matches = true;

    for (const [j, searchLine] of searchLines.entries()) {
      const originalLine = originalLines[i + j];
      if (!originalLine) {
        matches = false;
        break;
      }
      const originalTrimmed = originalLine.trim();
      const searchTrimmed = searchLine.trim();

      if (originalTrimmed !== searchTrimmed) {
        matches = false;
        break;
      }
    }

    if (matches) {
      let matchStartIndex = 0;
      for (let k = 0; k < i; k++) {
        const line = originalLines[k];
        if (line !== undefined) {
          matchStartIndex += line.length + 1;
        }
      }

      let matchEndIndex = matchStartIndex;
      for (let k = 0; k < searchLines.length; k++) {
        const line = originalLines[i + k];
        if (line !== undefined) {
          matchEndIndex += line.length;
          if (k < searchLines.length - 1) {
            matchEndIndex += 1; // Add newline character except for the last line
          }
        }
      }

      yield content.substring(matchStartIndex, matchEndIndex);
    }
  }
};

const BlockAnchorReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n");
  const searchLines = find.split("\n");

  if (searchLines.length < 3) {
    return;
  }

  if (searchLines.at(-1) === "") {
    searchLines.pop();
  }

  const firstLineSearch = searchLines[0]?.trim();
  const lastLineSearch = searchLines.at(-1)?.trim();
  const searchBlockSize = searchLines.length;

  if (!firstLineSearch || !lastLineSearch) {
    return;
  }

  // Collect all candidate positions where both anchors match
  const candidates: { endLine: number; startLine: number }[] = [];
  for (let i = 0; i < originalLines.length; i++) {
    const originalLine = originalLines[i];
    if (!originalLine || originalLine.trim() !== firstLineSearch) {
      continue;
    }

    // Look for the matching last line after this first line
    for (let j = i + 2; j < originalLines.length; j++) {
      const lastLine = originalLines[j];
      if (lastLine && lastLine.trim() === lastLineSearch) {
        candidates.push({ endLine: j, startLine: i });
        break; // Only match the first occurrence of the last line
      }
    }
  }

  // Return immediately if no candidates
  if (candidates.length === 0) {
    return;
  }

  // Handle single candidate scenario (using relaxed threshold)
  if (candidates.length === 1) {
    const candidate = candidates[0];
    if (!candidate) {
      return;
    }
    const { endLine, startLine } = candidate;
    const actualBlockSize = endLine - startLine + 1;

    let similarity = 0;
    const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2); // Middle lines only

    if (linesToCheck > 0) {
      for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
        const originalLine = originalLines[startLine + j]?.trim() ?? "";
        const searchLine = searchLines[j]?.trim() ?? "";
        const maxLen = Math.max(originalLine.length, searchLine.length);
        if (maxLen === 0) {
          continue;
        }
        const distance = levenshtein(originalLine, searchLine);
        similarity += (1 - distance / maxLen) / linesToCheck;

        // Exit early when threshold is reached
        if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
          break;
        }
      }
    } else {
      // No middle lines to compare, just accept based on anchors
      similarity = 1;
    }

    if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
      let matchStartIndex = 0;
      for (let k = 0; k < startLine; k++) {
        const line = originalLines[k];
        if (line) {
          matchStartIndex += line.length + 1;
        }
      }
      let matchEndIndex = matchStartIndex;
      for (let k = startLine; k <= endLine; k++) {
        const line = originalLines[k];
        if (line) {
          matchEndIndex += line.length;
          if (k < endLine) {
            matchEndIndex += 1; // Add newline character except for the last line
          }
        }
      }
      yield content.substring(matchStartIndex, matchEndIndex);
    }
    return;
  }

  // Calculate similarity for multiple candidates
  let bestMatch: null | { endLine: number; startLine: number } = null;
  let maxSimilarity = -1;

  for (const candidate of candidates) {
    const { endLine, startLine } = candidate;
    const actualBlockSize = endLine - startLine + 1;

    let similarity = 0;
    const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2); // Middle lines only

    if (linesToCheck > 0) {
      for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
        const originalLine = originalLines[startLine + j]?.trim() ?? "";
        const searchLine = searchLines[j]?.trim() ?? "";
        const maxLen = Math.max(originalLine.length, searchLine.length);
        if (maxLen === 0) {
          continue;
        }
        const distance = levenshtein(originalLine, searchLine);
        similarity += 1 - distance / maxLen;
      }
      similarity /= linesToCheck; // Average similarity
    } else {
      // No middle lines to compare, just accept based on anchors
      similarity = 1;
    }

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  // Threshold judgment
  if (maxSimilarity >= MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD && bestMatch) {
    const { endLine, startLine } = bestMatch;
    let matchStartIndex = 0;
    for (let k = 0; k < startLine; k++) {
      const line = originalLines[k];
      if (line) {
        matchStartIndex += line.length + 1;
      }
    }
    let matchEndIndex = matchStartIndex;
    for (let k = startLine; k <= endLine; k++) {
      const line = originalLines[k];
      if (line) {
        matchEndIndex += line.length;
        if (k < endLine) {
          matchEndIndex += 1;
        }
      }
    }
    yield content.substring(matchStartIndex, matchEndIndex);
  }
};

const WhitespaceNormalizedReplacer: Replacer = function* (content, find) {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const normalizeWhitespace = (text: string) =>
    text.replaceAll(/\s+/g, " ").trim();
  const normalizedFind = normalizeWhitespace(find);

  // Handle single line matches
  const lines = content.split("\n");
  for (const line of lines) {
    if (normalizeWhitespace(line) === normalizedFind) {
      yield line;
    } else {
      // Only check for substring matches if the full line doesn't match
      const normalizedLine = normalizeWhitespace(line);
      if (normalizedLine.includes(normalizedFind)) {
        // Find the actual substring in the original line that matches
        const words = find.trim().split(/\s+/);
        if (words.length > 0) {
          const pattern = words
            .map((word) => word.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("\\s+");
          try {
            const regex = new RegExp(pattern);
            const match = line.match(regex);
            if (match) {
              yield match[0];
            }
          } catch {
            // Invalid regex pattern, skip
          }
        }
      }
    }
  }

  // Handle multi-line matches
  const findLines = find.split("\n");
  if (findLines.length > 1) {
    for (let i = 0; i <= lines.length - findLines.length; i++) {
      const block = lines.slice(i, i + findLines.length);
      if (normalizeWhitespace(block.join("\n")) === normalizedFind) {
        yield block.join("\n");
      }
    }
  }
};

const IndentationFlexibleReplacer: Replacer = function* (content, find) {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const removeIndentation = (text: string) => {
    const lines = text.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) {
      return text;
    }

    const minIndent = Math.min(
      ...nonEmptyLines.map((line) => {
        const match = /^(\s*)/.exec(line);
        return match?.[1]?.length ?? 0;
      }),
    );

    return lines
      .map((line) => (line.trim().length === 0 ? line : line.slice(minIndent)))
      .join("\n");
  };

  const normalizedFind = removeIndentation(find);
  const contentLines = content.split("\n");
  const findLines = find.split("\n");

  for (let i = 0; i <= contentLines.length - findLines.length; i++) {
    const block = contentLines.slice(i, i + findLines.length).join("\n");
    if (removeIndentation(block) === normalizedFind) {
      yield block;
    }
  }
};

const EscapeNormalizedReplacer: Replacer = function* (content, find) {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const unescapeString = (str: string): string => {
    return str.replaceAll(/\\([ntr'"`\\\n$])/g, (match, capturedChar) => {
      switch (capturedChar) {
        case "\n": {
          return "\n";
        }
        case '"': {
          return '"';
        }
        case "$": {
          return "$";
        }
        case "'": {
          return "'";
        }
        case "\\": {
          return "\\";
        }
        case "`": {
          return "`";
        }
        case "n": {
          return "\n";
        }
        case "r": {
          return "\r";
        }
        case "t": {
          return "\t";
        }
        default: {
          return match;
        }
      }
    });
  };

  const unescapedFind = unescapeString(find);

  // Try direct match with unescaped find string
  if (content.includes(unescapedFind)) {
    yield unescapedFind;
  }

  // Also try finding escaped versions in content that match unescaped find
  const lines = content.split("\n");
  const findLines = unescapedFind.split("\n");

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n");
    const unescapedBlock = unescapeString(block);

    if (unescapedBlock === unescapedFind) {
      yield block;
    }
  }
};

const TrimmedBoundaryReplacer: Replacer = function* (content, find) {
  const trimmedFind = find.trim();

  if (trimmedFind === find) {
    // Already trimmed, no point in trying
    return;
  }

  // Try to find the trimmed version
  if (content.includes(trimmedFind)) {
    yield trimmedFind;
  }

  // Also try finding blocks where trimmed content matches
  const lines = content.split("\n");
  const findLines = find.split("\n");

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n");

    if (block.trim() === trimmedFind) {
      yield block;
    }
  }
};

const ContextAwareReplacer: Replacer = function* (content, find) {
  const findLines = find.split("\n");
  if (findLines.length < 3) {
    // Need at least 3 lines to have meaningful context
    return;
  }

  // Remove trailing empty line if present
  if (findLines.at(-1) === "") {
    findLines.pop();
  }

  const contentLines = content.split("\n");

  // Extract first and last lines as context anchors
  const firstLine = findLines[0]?.trim();
  const lastLine = findLines.at(-1)?.trim();

  if (!firstLine || !lastLine) {
    return;
  }

  // Find blocks that start and end with the context anchors
  for (let i = 0; i < contentLines.length; i++) {
    const currentLine = contentLines[i];
    if (!currentLine || currentLine.trim() !== firstLine) {
      continue;
    }

    // Look for the matching last line
    for (let j = i + 2; j < contentLines.length; j++) {
      const endLine = contentLines[j];
      if (endLine && endLine.trim() === lastLine) {
        // Found a potential context block
        const blockLines = contentLines.slice(i, j + 1);
        const block = blockLines.join("\n");

        // Check if the middle content has reasonable similarity
        // (simple heuristic: at least 50% of non-empty lines should match when trimmed)
        if (blockLines.length === findLines.length) {
          let matchingLines = 0;
          let totalNonEmptyLines = 0;

          for (let k = 1; k < blockLines.length - 1; k++) {
            const blockLine = blockLines[k]?.trim() ?? "";
            const findLine = findLines[k]?.trim() ?? "";

            if (blockLine.length > 0 || findLine.length > 0) {
              totalNonEmptyLines++;
              if (blockLine === findLine) {
                matchingLines++;
              }
            }
          }

          if (
            totalNonEmptyLines === 0 ||
            matchingLines / totalNonEmptyLines >= 0.5
          ) {
            yield block;
            break; // Only match the first occurrence
          }
        }
        break;
      }
    }
  }
};

const MultiOccurrenceReplacer: Replacer = function* (content, find) {
  // This replacer yields all exact matches, allowing the replace function
  // to handle multiple occurrences based on replaceAll parameter
  let startIndex = 0;

  while (true) {
    const index = content.indexOf(find, startIndex);
    if (index === -1) {
      break;
    }

    yield find;
    startIndex = index + find.length;
  }
};

function replace(
  content: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): string {
  if (oldString === newString) {
    throw new Error("oldString and newString must be different");
  }

  let notFound = true;

  for (const replacer of [
    SimpleReplacer,
    LineTrimmedReplacer,
    BlockAnchorReplacer,
    WhitespaceNormalizedReplacer,
    IndentationFlexibleReplacer,
    EscapeNormalizedReplacer,
    TrimmedBoundaryReplacer,
    ContextAwareReplacer,
    MultiOccurrenceReplacer,
  ]) {
    for (const search of replacer(content, oldString)) {
      const index = content.indexOf(search);
      if (index === -1) {
        continue;
      }
      notFound = false;
      if (replaceAll) {
        return content.replaceAll(search, newString);
      }
      const lastIndex = content.lastIndexOf(search);
      if (index !== lastIndex) {
        continue;
      }
      return (
        content.slice(0, Math.max(0, index)) +
        newString +
        content.slice(Math.max(0, index + search.length))
      );
    }
  }

  if (notFound) {
    throw new Error("oldString not found in content");
  }
  throw new Error(
    "Found multiple matches for oldString. Include more surrounding code lines in oldString to uniquely identify which occurrence to replace.",
  );
}

export const EditFile = createTool({
  description: dedent`
    Performs exact string replacements in files. 

    Usage:
    - The ${INPUT_PARAMS.filePath} parameter must be a relative path. E.g. ./src/client/app.tsx
    - You must use your \`${ReadFile.name}\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. 
    - When editing text from \`${ReadFile.name}\` tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the \`${INPUT_PARAMS.oldString}\` or \`${INPUT_PARAMS.newString}\`.
    - ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
    - Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
    - The edit will FAIL if \`${INPUT_PARAMS.oldString}\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`${INPUT_PARAMS.replaceAll}\` to change every instance of \`${INPUT_PARAMS.oldString}\`. 
    - Use \`${INPUT_PARAMS.replaceAll}\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
    - Multiple calls to this tool will be run in serial, ensuring that each edit is complete before the next one starts.
    - Using this tool multiple times in parallel will still greatly improve efficiency and reduce costs.
  `,
  execute: async ({ appConfig, input, signal }) => {
    if (input.oldString === input.newString) {
      return executeError("oldString and newString must be different");
    }

    const fixedPathResult = ensureRelativePath(input.filePath);
    if (fixedPathResult.isErr()) {
      return err(fixedPathResult.error);
    }
    const fixedPath = fixedPathResult.value;

    const absolutePath = absolutePathJoin(appConfig.appDir, fixedPath);
    const exists = await pathExists(absolutePath);

    if (!exists) {
      return executeError(`File ${fixedPath} not found`);
    }

    // Check file size
    const fs = await import("node:fs/promises");
    const stats = await fs.stat(absolutePath);
    if (stats.size > MAX_FILE_SIZE) {
      return executeError(
        `File is too large (${stats.size} bytes). Maximum size is ${MAX_FILE_SIZE} bytes`,
      );
    }

    if (stats.isDirectory()) {
      return executeError(`Path is a directory, not a file: ${fixedPath}`);
    }

    let contentOld = "";
    let contentNew = "";

    try {
      if (input.oldString === "") {
        contentNew = input.newString;
        await writeFileWithDir(absolutePath, input.newString, { signal });
      } else {
        contentOld = await fs.readFile(absolutePath, "utf8");
        contentNew = replace(
          contentOld,
          input.oldString,
          input.newString,
          input.replaceAll,
        );
        await writeFileWithDir(absolutePath, contentNew, { signal });
      }

      return ok({
        filePath: fixedPath,
        newContent: contentNew,
        oldContent: contentOld,
      });
    } catch (error) {
      return executeError(
        `Failed to edit file ${fixedPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.filePath]: z
      .string()
      .meta({ description: "The path to the file to modify" }),
    [INPUT_PARAMS.newString]: z.string().meta({
      description:
        "The text to replace it with (must be different from oldString)",
    }),
    [INPUT_PARAMS.oldString]: z
      .string()
      .meta({ description: "The text to find and replace" }),
    [INPUT_PARAMS.replaceAll]: z.boolean().optional().meta({
      description: "Replace all occurrences of oldString (default false)",
    }),
  }),
  name: "edit_file",
  outputSchema: z.object({
    filePath: RelativePathSchema,
    newContent: z.string(),
    oldContent: z.string(),
  }),
  readOnly: false,
  timeoutMs: ms("15 seconds"),
  toModelOutput: ({ output: result }) => {
    return {
      type: "text",
      value: sift([
        `Successfully edited file ${result.filePath}`,
        diagnosticsReminder(result.filePath),
      ]).join("\n\n"),
    };
  },
});

/* eslint-enable unicorn/prefer-string-slice */
