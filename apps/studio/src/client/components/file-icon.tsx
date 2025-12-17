import type { ComponentType } from "react";

import {
  BsFileEarmark,
  BsFileEarmarkExcel,
  BsFileEarmarkMusic,
  BsFileEarmarkPlay,
  BsFileEarmarkPpt,
  BsFileEarmarkRichtext,
  BsFileEarmarkSpreadsheet,
  BsFileEarmarkWord,
} from "react-icons/bs";
import {
  SiCss3,
  SiDocker,
  SiGit,
  SiGnubash,
  SiGraphql,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiMarkdown,
  SiPython,
  SiReact,
  SiRust,
  SiSass,
  SiSvelte,
  SiSvg,
  SiTypescript,
  SiVuedotjs,
  SiYaml,
} from "react-icons/si";
import { VscFilePdf, VscFileZip } from "react-icons/vsc";

type IconComponent = ComponentType<{ className?: string }>;

const EXTENSION_ICON_MAP: Record<string, IconComponent> = {
  // cspell:ignore gnubash, flac
  "7z": VscFileZip,
  aac: BsFileEarmarkMusic,
  avi: BsFileEarmarkPlay,
  bash: SiGnubash,
  css: SiCss3,
  csv: BsFileEarmarkSpreadsheet,
  doc: BsFileEarmarkWord,
  dockerfile: SiDocker,
  docx: BsFileEarmarkWord,
  epub: BsFileEarmarkRichtext,
  flac: BsFileEarmarkMusic,
  gitignore: SiGit,
  gql: SiGraphql,
  graphql: SiGraphql,
  gz: VscFileZip,
  htm: SiHtml5,
  html: SiHtml5,
  js: SiJavascript,
  json: SiJson,
  jsx: SiReact,
  key: BsFileEarmarkPpt,
  m4a: BsFileEarmarkMusic,
  md: SiMarkdown,
  mdx: SiMarkdown,
  mjs: SiJavascript,
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
  pages: BsFileEarmarkWord,
  pdf: VscFilePdf,
  ppt: BsFileEarmarkPpt,
  pptx: BsFileEarmarkPpt,
  py: SiPython,
  rar: VscFileZip,
  rs: SiRust,
  rtf: BsFileEarmarkRichtext,
  sass: SiSass,
  scss: SiSass,
  sh: SiGnubash,
  svelte: SiSvelte,
  svg: SiSvg,
  tar: VscFileZip,
  ts: SiTypescript,
  tsv: BsFileEarmarkSpreadsheet,
  tsx: SiReact,
  txt: BsFileEarmarkRichtext,
  vue: SiVuedotjs,
  wav: BsFileEarmarkMusic,
  webm: BsFileEarmarkPlay,
  xls: BsFileEarmarkExcel,
  xlsx: BsFileEarmarkExcel,
  yaml: SiYaml,
  yml: SiYaml,
  zip: VscFileZip,
};

const FILENAME_ICON_MAP: Record<string, IconComponent> = {
  ".gitignore": SiGit,
  dockerfile: SiDocker,
};

export function FileIcon({
  className = "size-5",
  filename,
}: {
  className?: string;
  filename: string;
}) {
  const Icon = getFileIcon(filename);
  const ext = getFileExtension(filename);

  if (Icon === null) {
    if (!ext) {
      return <BsFileEarmark className={className} />;
    }

    return (
      <div
        className={`${className} flex items-center justify-center rounded border border-border bg-muted text-[0.45em] font-semibold uppercase text-muted-foreground`}
      >
        {ext.slice(0, 4)}
      </div>
    );
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

function getFileIcon(filename: string): IconComponent | null {
  const lowerName = filename.toLowerCase();

  if (FILENAME_ICON_MAP[lowerName]) {
    return FILENAME_ICON_MAP[lowerName];
  }

  const ext = getFileExtension(filename);
  return EXTENSION_ICON_MAP[ext] ?? null;
}
