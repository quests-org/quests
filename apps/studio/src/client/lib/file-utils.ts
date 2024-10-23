export function cleanFilePath(filePath: string): string {
  return filePath.replace(/^(?:\.\/)?src\//, "");
}
