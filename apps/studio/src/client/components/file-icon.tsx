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

const EXTENSION_ICON_MAP: Record<string, IconType | null> = {
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
  gml: BsFileCode,
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
  kml: BsFileCode,
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
  rss: BsFileCode,
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
  xhtml: BsFileCode,
  xls: BsFileEarmarkSpreadsheet,
  xlsx: BsFileEarmarkSpreadsheet,
  xml: BsFileCode,
  yaml: BsFileCode,
  yml: BsFileCode,
  zip: VscFileZip,
};

const FILENAME_ICON_MAP: Record<string, IconType | null> = {
  ".gitignore": BsFileCode,
  dockerfile: BsFileCode,
};

export function FileIcon({
  className = "size-5",
  fallbackExtension,
  filename,
}: {
  className?: string;
  fallbackExtension?: string;
  filename: string;
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
