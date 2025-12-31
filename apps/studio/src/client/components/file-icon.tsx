import type { ComponentType } from "react";

import {
  BsFileBinary,
  BsFileCode,
  BsFileEarmarkMusic,
  BsFileEarmarkPlay,
  BsFileEarmarkPpt,
  BsFileEarmarkRichtext,
  BsFileEarmarkSpreadsheet,
  BsFileEarmarkWord,
  BsFileText,
  BsFiletypeAac,
  BsFiletypeAi,
  BsFiletypeBmp,
  BsFiletypeCs,
  BsFiletypeCss,
  BsFiletypeCsv,
  BsFiletypeDoc,
  BsFiletypeDocx,
  BsFiletypeExe,
  BsFiletypeGif,
  BsFiletypeHeic,
  BsFiletypeHtml,
  BsFiletypeJava,
  BsFiletypeJpg,
  BsFiletypeJs,
  BsFiletypeJson,
  BsFiletypeJsx,
  BsFiletypeKey,
  BsFiletypeM4P,
  BsFiletypeMd,
  BsFiletypeMdx,
  BsFiletypeMov,
  BsFiletypeMp3,
  BsFiletypeMp4,
  BsFiletypeOtf,
  BsFiletypePdf,
  BsFiletypePhp,
  BsFiletypePng,
  BsFiletypePpt,
  BsFiletypePptx,
  BsFiletypePsd,
  BsFiletypePy,
  BsFiletypeRaw,
  BsFiletypeRb,
  BsFiletypeSass,
  BsFiletypeScss,
  BsFiletypeSh,
  BsFiletypeSql,
  BsFiletypeSvg,
  BsFiletypeTiff,
  BsFiletypeTsx,
  BsFiletypeTtf,
  BsFiletypeTxt,
  BsFiletypeWav,
  BsFiletypeWoff,
  BsFiletypeXls,
  BsFiletypeXlsx,
  BsFiletypeXml,
  BsFiletypeYml,
} from "react-icons/bs";
import { VscFileZip } from "react-icons/vsc";

type IconComponent = ComponentType<{ className?: string }>;

const EXTENSION_ICON_MAP: Record<string, IconComponent> = {
  // cspell:ignore flac
  "7z": VscFileZip,
  aac: BsFiletypeAac,
  ai: BsFiletypeAi,
  avi: BsFileEarmarkPlay,
  bash: BsFiletypeSh,
  bmp: BsFiletypeBmp,
  cs: BsFiletypeCs,
  css: BsFiletypeCss,
  csv: BsFiletypeCsv,
  doc: BsFiletypeDoc,
  docx: BsFiletypeDocx,
  epub: BsFileEarmarkRichtext,
  exe: BsFiletypeExe,
  flac: BsFileEarmarkMusic,
  gif: BsFiletypeGif,
  gz: VscFileZip,
  heic: BsFiletypeHeic,
  htm: BsFiletypeHtml,
  html: BsFiletypeHtml,
  java: BsFiletypeJava,
  jpeg: BsFiletypeJpg,
  jpg: BsFiletypeJpg,
  js: BsFiletypeJs,
  json: BsFiletypeJson,
  jsx: BsFiletypeJsx,
  key: BsFiletypeKey,
  m4a: BsFiletypeM4P,
  md: BsFiletypeMd,
  mdx: BsFiletypeMdx,
  mjs: BsFiletypeJs,
  mkv: BsFileEarmarkPlay,
  mov: BsFiletypeMov,
  mp3: BsFiletypeMp3,
  mp4: BsFiletypeMp4,
  numbers: BsFileEarmarkSpreadsheet,
  odf: BsFileEarmarkRichtext,
  odp: BsFileEarmarkPpt,
  ods: BsFileEarmarkSpreadsheet,
  odt: BsFileEarmarkWord,
  ogg: BsFileEarmarkMusic,
  otf: BsFiletypeOtf,
  pages: BsFileEarmarkWord,
  pdf: BsFiletypePdf,
  php: BsFiletypePhp,
  png: BsFiletypePng,
  ppt: BsFiletypePpt,
  pptx: BsFiletypePptx,
  psd: BsFiletypePsd,
  py: BsFiletypePy,
  rar: VscFileZip,
  raw: BsFiletypeRaw,
  rb: BsFiletypeRb,
  rtf: BsFileEarmarkRichtext,
  sass: BsFiletypeSass,
  scss: BsFiletypeScss,
  sh: BsFiletypeSh,
  sql: BsFiletypeSql,
  svg: BsFiletypeSvg,
  tar: VscFileZip,
  tiff: BsFiletypeTiff,
  ts: BsFiletypeTsx,
  tsv: BsFileEarmarkSpreadsheet,
  tsx: BsFiletypeTsx,
  ttf: BsFiletypeTtf,
  txt: BsFiletypeTxt,
  wav: BsFiletypeWav,
  webm: BsFileEarmarkPlay,
  woff: BsFiletypeWoff,
  xls: BsFiletypeXls,
  xlsx: BsFiletypeXlsx,
  xml: BsFiletypeXml,
  yaml: BsFiletypeYml,
  yml: BsFiletypeYml,
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
