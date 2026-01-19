export function filenameFromFilePath(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}
