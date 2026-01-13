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
} from "react-icons/bs";
import { type IconType } from "react-icons/lib";
import { VscFileZip } from "react-icons/vsc";

import { EXTENSION_MAP } from "../lib/file-extension-to-language";

const codeFileExtensions: Record<string, IconType> = {};
for (const ext of Object.keys(EXTENSION_MAP)) {
  codeFileExtensions[ext] = BsFileCode;
}

const EXTENSION_ICON_MAP: Record<string, IconType | null> = {
  ...codeFileExtensions,
  // cspell:ignore flac
  "7z": VscFileZip,
  aac: BsFileEarmarkMusic,
  ai: BsFileEarmarkImage,
  avi: BsFileEarmarkPlay,
  bmp: BsFileEarmarkImage,
  csv: BsFileEarmarkSpreadsheet,
  doc: BsFileEarmarkWord,
  docx: BsFileEarmarkWord,
  epub: BsFileEarmarkRichtext,
  exe: BsFileBinary,
  flac: BsFileEarmarkMusic,
  gif: BsFileEarmarkImage,
  gz: VscFileZip,
  heic: BsFileEarmarkImage,
  jpeg: BsFileEarmarkImage,
  jpg: BsFileEarmarkImage,
  key: BsFileEarmarkPpt,
  m4a: BsFileEarmarkMusic,
  md: BsFileEarmarkText,
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
  png: BsFileEarmarkImage,
  ppt: BsFileEarmarkPpt,
  pptx: BsFileEarmarkPpt,
  psd: BsFileEarmarkImage,
  rar: VscFileZip,
  raw: BsFileEarmarkImage,
  rtf: BsFileEarmarkRichtext,
  svg: BsFileEarmarkImage,
  tar: VscFileZip,
  tiff: BsFileEarmarkImage,
  tsv: BsFileEarmarkSpreadsheet,
  ttf: BsFileEarmarkFont,
  txt: BsFileEarmarkText,
  wav: BsFileEarmarkMusic,
  webm: BsFileEarmarkPlay,
  woff: BsFileEarmarkFont,
  xls: BsFileEarmarkSpreadsheet,
  xlsx: BsFileEarmarkSpreadsheet,
  zip: VscFileZip,
};

const FILENAME_ICON_MAP: Record<string, IconType | null> = {
  ".gitignore": BsFileCode,
  changelog: BsFileEarmarkText,
  dockerfile: BsFileCode,
  license: BsFileEarmarkText,
  readme: BsFileEarmarkText,
};

export function FileIcon({
  className = "size-5",
  fallbackExtension,
  filename,
  mimeType,
}: {
  className?: string;
  fallbackExtension?: string;
  filename: string;
  mimeType?: string;
}) {
  let Icon: IconType = BsFileBinary;
  const lowerName = filename.toLowerCase();

  if (FILENAME_ICON_MAP[lowerName]) {
    Icon = FILENAME_ICON_MAP[lowerName];
  } else {
    const ext = getFileExtension(filename);
    if (EXTENSION_ICON_MAP[ext]) {
      Icon = EXTENSION_ICON_MAP[ext];
    } else if (
      fallbackExtension &&
      EXTENSION_ICON_MAP[fallbackExtension.toLowerCase()]
    ) {
      Icon = EXTENSION_ICON_MAP[fallbackExtension.toLowerCase()] ?? Icon;
    } else if (mimeType?.startsWith("text/")) {
      Icon = BsFileEarmarkText;
    }
  }

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
