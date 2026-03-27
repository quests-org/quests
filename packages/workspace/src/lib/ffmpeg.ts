import { createRequire } from "node:module";
import path from "node:path";

declare const __FFMPEG_STATIC_PATH__: string;

// ffmpeg-static is CJS and uses __dirname, which breaks if bundled into ESM.
// In dev the vite config bakes in the absolute resolved path so createRequire
// can find it without node_modules alongside the output. In prod it bakes in
// the bare specifier "ffmpeg-static", which the packaged node_modules resolves
// correctly at runtime.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ffmpegPath: null | string = createRequire(import.meta.url)(
  __FFMPEG_STATIC_PATH__,
);

// Fix the path to the ffmpeg binary if it's in an .asar file
// via https://github.com/desktop/dugite/blob/0a316c7028f073ad05cea17fe219324e7ef13967/lib/git-environment.ts#L24
export const FFMPEG_PATH = (ffmpegPath ?? "ffmpeg").replace(
  /[\\/]app.asar[\\/]/,
  `${path.sep}app.asar.unpacked${path.sep}`,
);
