export function filenameFromFilePath(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

export function folderNameFromPath(folderPath: string): string {
  return folderPath.split(/[\\/]/).pop() || folderPath;
}
