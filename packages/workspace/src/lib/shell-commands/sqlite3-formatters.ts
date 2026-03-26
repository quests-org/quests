export interface FormatOptions {
  header: boolean;
  mode: OutputMode;
  newline: string;
  nullValue: string;
  separator: string;
}

export type OutputMode =
  | "ascii"
  | "box"
  | "column"
  | "csv"
  | "html"
  | "json"
  | "line"
  | "list"
  | "markdown"
  | "quote"
  | "table"
  | "tabs";

export function formatOutput(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  switch (options.mode) {
    case "ascii": {
      return formatAscii(columns, rows, options);
    }
    case "box": {
      return formatBox(columns, rows, options);
    }
    case "column": {
      return formatColumn(columns, rows, options);
    }
    case "csv": {
      return formatCsv(columns, rows, options);
    }
    case "html": {
      return formatHtml(columns, rows, options);
    }
    case "json": {
      return formatJson(columns, rows);
    }
    case "line": {
      return formatLine(columns, rows, options);
    }
    case "list": {
      return formatList(columns, rows, options);
    }
    case "markdown": {
      return formatMarkdown(columns, rows, options);
    }
    case "quote": {
      return formatQuote(columns, rows, options);
    }
    case "table": {
      return formatTable(columns, rows, options);
    }
    case "tabs": {
      return formatTabs(columns, rows, options);
    }
  }
}

function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("'") ||
    value.includes("\n")
  ) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function floatToFullPrecision(value: number): string {
  return value.toPrecision(17).replace(/\.?0+$/, "");
}

function formatAscii(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const colSep = String.fromCodePoint(0x1f);
  const rowSep = String.fromCodePoint(0x1e);

  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(columns.join(colSep));
  }
  for (const row of rows) {
    lines.push(
      row.map((v) => valueToString(v, options.nullValue)).join(colSep),
    );
  }
  return lines.length > 0 ? lines.join(rowSep) + rowSep : "";
}

function formatBox(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  if (columns.length === 0) {
    return "";
  }

  const widths = columns.map((c) => c.length);
  for (const row of rows) {
    for (const [i, element] of row.entries()) {
      updateWidth(widths, i, valueToString(element, options.nullValue).length);
    }
  }

  const lines: string[] = [
    `┌${widths.map((ww) => "─".repeat(ww + 2)).join("┬")}┐`,
    `│ ${columns.map((c, i) => c.padEnd(w(widths, i))).join(" │ ")} │`,
    `├${widths.map((ww) => "─".repeat(ww + 2)).join("┼")}┤`,
  ];
  for (const row of rows) {
    lines.push(
      `│ ${row.map((v, i) => valueToString(v, options.nullValue).padEnd(w(widths, i))).join(" │ ")} │`,
    );
  }
  lines.push(`└${widths.map((ww) => "─".repeat(ww + 2)).join("┴")}┘`);
  return `${lines.join("\n")}\n`;
}

function formatColumn(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  if (columns.length === 0) {
    return "";
  }

  const widths = columns.map((c) => c.length);
  for (const row of rows) {
    for (const [i, element] of row.entries()) {
      updateWidth(widths, i, valueToString(element, options.nullValue).length);
    }
  }

  const lines: string[] = [];
  if (options.header) {
    lines.push(
      columns.map((c, i) => c.padEnd(w(widths, i))).join("  "),
      widths.map((ww) => "-".repeat(ww)).join("  "),
    );
  }
  for (const row of rows) {
    lines.push(
      row
        .map((v, i) => valueToString(v, options.nullValue).padEnd(w(widths, i)))
        .join("  "),
    );
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatCsv(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(columns.map(escapeCsvField).join(","));
  }
  for (const row of rows) {
    lines.push(
      row
        .map((v) => escapeCsvField(valueToString(v, options.nullValue)))
        .join(","),
    );
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatHtml(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(
      `<TR>${columns.map((c) => `<TH>${escapeHtml(c)}</TH>`).join("")}`,
      "</TR>",
    );
  }
  for (const row of rows) {
    lines.push(
      `<TR>${row.map((v) => `<TD>${escapeHtml(valueToString(v, options.nullValue))}</TD>`).join("")}`,
      "</TR>",
    );
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatJson(columns: string[], rows: unknown[][]): string {
  if (rows.length === 0) {
    return "";
  }

  const objects = rows.map((row) => {
    const pairs = columns.map(
      (col, i) => `${JSON.stringify(col)}:${valueToJson(row[i])}`,
    );
    return `{${pairs.join(",")}}`;
  });

  return `[${objects.join(",\n")}]\n`;
}

function formatLine(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  if (columns.length === 0 || rows.length === 0) {
    return "";
  }

  const maxColLen = Math.max(5, ...columns.map((c) => c.length));

  const lines: string[] = [];
  for (const row of rows) {
    for (const [i, column] of columns.entries()) {
      const paddedCol = column.padStart(maxColLen);
      lines.push(`${paddedCol} = ${valueToString(row[i], options.nullValue)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function formatList(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(columns.join(options.separator));
  }
  for (const row of rows) {
    lines.push(
      row
        .map((v) => valueToString(v, options.nullValue))
        .join(options.separator),
    );
  }
  return lines.length > 0
    ? `${lines.join(options.newline)}${options.newline}`
    : "";
}

function formatMarkdown(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  if (columns.length === 0) {
    return "";
  }

  const lines: string[] = [];
  if (options.header) {
    lines.push(`| ${columns.join(" | ")} |`, `|${columns.map(() => "---").join("|")}|`);
  }
  for (const row of rows) {
    lines.push(
      `| ${row.map((v) => valueToString(v, options.nullValue)).join(" | ")} |`,
    );
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatQuote(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(columns.map((c) => `'${c}'`).join(","));
  }
  for (const row of rows) {
    lines.push(
      row
        .map((v) => {
          if (v === null || v === undefined) {
            return "NULL";
          }
          if (typeof v === "number") {
            if (Number.isInteger(v)) {
              return String(v);
            }
            return floatToFullPrecision(v);
          }
          return `'${typeof v === "string" ? v : JSON.stringify(v)}'`;
        })
        .join(","),
    );
  }
  return lines.length > 0
    ? `${lines.join(options.newline)}${options.newline}`
    : "";
}

function formatTable(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  if (columns.length === 0) {
    return "";
  }

  const widths = columns.map((c) => c.length);
  for (const row of rows) {
    for (const [i, element] of row.entries()) {
      updateWidth(widths, i, valueToString(element, options.nullValue).length);
    }
  }

  const lines: string[] = [];
  const border = `+${widths.map((ww) => "-".repeat(ww + 2)).join("+")}+`;

  lines.push(border);
  if (options.header) {
    lines.push(
      `| ${columns.map((c, i) => c.padEnd(w(widths, i))).join(" | ")} |`,
      border,
    );
  }
  for (const row of rows) {
    lines.push(
      `| ${row.map((v, i) => valueToString(v, options.nullValue).padEnd(w(widths, i))).join(" | ")} |`,
    );
  }
  lines.push(border);
  return `${lines.join("\n")}\n`;
}

function formatTabs(
  columns: string[],
  rows: unknown[][],
  options: FormatOptions,
): string {
  const lines: string[] = [];
  if (options.header && columns.length > 0) {
    lines.push(columns.join("\t"));
  }
  for (const row of rows) {
    lines.push(row.map((v) => valueToString(v, options.nullValue)).join("\t"));
  }
  return lines.length > 0
    ? `${lines.join(options.newline)}${options.newline}`
    : "";
}

function updateWidth(widths: number[], i: number, len: number): void {
  if (len > (widths[i] ?? 0)) {
    widths[i] = len;
  }
}

function valueToJson(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return floatToFullPrecision(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function valueToString(value: unknown, nullValue: string): string {
  if (value === null || value === undefined) {
    return nullValue;
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value as Uint8Array).toString("utf8");
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toPrecision(17).replace(/\.?0+$/, "");
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
}

function w(widths: number[], i: number): number {
  return widths[i] ?? 0;
}
