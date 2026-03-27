import { createRequire } from "node:module";

import { unpackAsarPath } from "./asar";

declare const __FFMPEG_STATIC_PATH__: string;
declare const __FFPROBE_STATIC_PATH__: string;

// ffmpeg-static and ffprobe-static are CJS and use __dirname, which breaks if
// bundled into ESM. In dev the vite config bakes in the absolute resolved path
// so createRequire can find it without node_modules alongside the output. In
// prod it bakes in the bare specifier, which the packaged node_modules resolves
// correctly at runtime.
const req = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ffmpegPath: null | string = req(__FFMPEG_STATIC_PATH__);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ffprobePath: null | string = req(__FFPROBE_STATIC_PATH__);

export const FFMPEG_PATH = unpackAsarPath(ffmpegPath ?? "ffmpeg");
export const FFPROBE_PATH = unpackAsarPath(ffprobePath ?? "ffprobe");
