export function addLineNumbers(content: string, offset = 0): string {
  return content
    .split(/\r?\n/)
    .map(
      // Padded to 4 digits because a 250k source file (the size limit) can have
      // roughly 5,000 lines
      (line, i) => `${(i + 1 + offset).toString().padStart(4, " ")}→${line}`,
    )
    .join("\n");
}
