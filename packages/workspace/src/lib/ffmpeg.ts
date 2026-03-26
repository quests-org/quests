import { createRequire } from "node:module";
import path from "node:path";

// ffmpeg-static is CJS and uses __dirname. We keep it external (not bundled)
// so Node's CJS loader resolves it at runtime from the packaged node_modules,
// avoiding the build-machine absolute path being baked into the bundle.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ffmpegPath: null | string = createRequire(import.meta.url)(
  "ffmpeg-static",
);

// Fix the path to the ffmpeg binary if it's in an .asar file
// via https://github.com/desktop/dugite/blob/0a316c7028f073ad05cea17fe219324e7ef13967/lib/git-environment.ts#L24
export const FFMPEG_PATH = (ffmpegPath ?? "ffmpeg").replace(
  /[\\/]app.asar[\\/]/,
  `${path.sep}app.asar.unpacked${path.sep}`,
);
