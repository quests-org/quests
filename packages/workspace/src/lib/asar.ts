import path from "node:path";

// Fix binary paths that land inside an .asar archive so Electron can execute
// them from the unpacked copy on disk.
// via https://github.com/desktop/dugite/blob/0a316c7028f073ad05cea17fe219324e7ef13967/lib/git-environment.ts#L24
export function unpackAsarPath(binaryPath: string) {
  return binaryPath.replace(
    /[\\/]app.asar[\\/]/,
    `${path.sep}app.asar.unpacked${path.sep}`,
  );
}
