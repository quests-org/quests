import { createRequire } from "node:module";
import path from "node:path";

declare const __FFMPEG_STATIC_PATH__: string;

// ffmpeg-static is CJS and uses __dirname, which breaks in an ESM context.
// The vite config resolves and bakes in the absolute path to ffmpeg-static's
// index.js at build time so createRequire can load it as CJS in both dev and
// prod, regardless of where the bundled output lives.
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
