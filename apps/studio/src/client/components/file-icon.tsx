import type { ComponentType } from "react";

import {
  BsFileBinary,
  BsFileCode,
  BsFileEarmarkFont,
  BsFileEarmarkImage,
  BsFileEarmarkMusic,
  BsFileEarmarkPlay,
  BsFileEarmarkPpt,
  BsFileEarmarkRichtext,
  BsFileEarmarkSpreadsheet,
  BsFileEarmarkText,
  BsFileEarmarkWord,
  BsFilePdf,
  BsFileText,
} from "react-icons/bs";
import { VscFileZip } from "react-icons/vsc";

type IconComponent = ComponentType<{ className?: string }>;

const EXTENSION_ICON_MAP: Record<string, IconComponent> = {
  // cspell:ignore flac
  "7z": VscFileZip,
  aac: BsFileEarmarkMusic,
  ai: BsFileEarmarkImage,
  avi: BsFileEarmarkPlay,
  bash: BsFileCode,
  bmp: BsFileEarmarkImage,
  cs: BsFileCode,
  css: BsFileCode,
  csv: BsFileEarmarkSpreadsheet,
  doc: BsFileEarmarkWord,
  docx: BsFileEarmarkWord,
  epub: BsFileEarmarkRichtext,
  exe: BsFileBinary,
  flac: BsFileEarmarkMusic,
  gif: BsFileEarmarkImage,
  gz: VscFileZip,
  heic: BsFileEarmarkImage,
  htm: BsFileCode,
  html: BsFileCode,
  java: BsFileCode,
  jpeg: BsFileEarmarkImage,
  jpg: BsFileEarmarkImage,
  js: BsFileCode,
  json: BsFileCode,
  jsx: BsFileCode,
  key: BsFileEarmarkPpt,
  m4a: BsFileEarmarkMusic,
  md: BsFileEarmarkText,
  mdx: BsFileCode,
  mjs: BsFileCode,
  mkv: BsFileEarmarkPlay,
  mov: BsFileEarmarkPlay,
  mp3: BsFileEarmarkMusic,
  mp4: BsFileEarmarkPlay,
  numbers: BsFileEarmarkSpreadsheet,
  odf: BsFileEarmarkRichtext,
  odp: BsFileEarmarkPpt,
  ods: BsFileEarmarkSpreadsheet,
  odt: BsFileEarmarkWord,
  ogg: BsFileEarmarkMusic,
  otf: BsFileEarmarkFont,
  pages: BsFileEarmarkWord,
  pdf: BsFilePdf,
  php: BsFileCode,
  png: BsFileEarmarkImage,
  ppt: BsFileEarmarkPpt,
  pptx: BsFileEarmarkPpt,
  psd: BsFileEarmarkImage,
  py: BsFileCode,
  rar: VscFileZip,
  raw: BsFileEarmarkImage,
  rb: BsFileCode,
  rtf: BsFileEarmarkRichtext,
  sass: BsFileCode,
  scss: BsFileCode,
  sh: BsFileCode,
  sql: BsFileCode,
  svg: BsFileEarmarkImage,
  tar: VscFileZip,
  tiff: BsFileEarmarkImage,
  ts: BsFileCode,
  tsv: BsFileEarmarkSpreadsheet,
  tsx: BsFileCode,
  ttf: BsFileEarmarkFont,
  txt: BsFileEarmarkText,
  wav: BsFileEarmarkMusic,
  webm: BsFileEarmarkPlay,
  woff: BsFileEarmarkFont,
  xls: BsFileEarmarkSpreadsheet,
  xlsx: BsFileEarmarkSpreadsheet,
  xml: BsFileCode,
  yaml: BsFileCode,
  yml: BsFileCode,
  zip: VscFileZip,
};

const FILENAME_ICON_MAP: Record<string, IconComponent> = {
  ".gitignore": BsFileCode,
  dockerfile: BsFileCode,
};

export function FileIcon({
  className = "size-5",
  filename,
  mimeType,
}: {
  className?: string;
  filename: string;
  mimeType?: string;
}) {
  const Icon = getFileIcon(filename, mimeType);

  if (Icon === null) {
    return <BsFileBinary className={className} />;
  }

  // Dynamic creation should be fine because the components have no state
  // eslint-disable-next-line react-hooks/static-components
  return <Icon className={className} />;
}

function getFileExtension(filename: string): string {
  const lowerName = filename.toLowerCase();
  const lastDotIndex = lowerName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return "";
  }
  return lowerName.slice(lastDotIndex + 1);
}

function getFileIcon(
  filename: string,
  mimeType?: string,
): IconComponent | null {
  const lowerName = filename.toLowerCase();

  if (FILENAME_ICON_MAP[lowerName]) {
    return FILENAME_ICON_MAP[lowerName];
  }

  const ext = getFileExtension(filename);
  const extIcon = EXTENSION_ICON_MAP[ext];

  if (extIcon) {
    return extIcon;
  }

  if (mimeType === "text/plain") {
    return BsFileText;
  }

  return null;
}
