import {
  openProjectFileViewerAtom,
  type ProjectFileViewerFile,
} from "@/client/atoms/project-file-viewer";
import { getFileType, isReadableText } from "@/client/lib/get-file-type";
import { cn } from "@/client/lib/utils";
import { APP_FOLDER_NAMES } from "@quests/workspace/client";
import { type SessionMessageDataPart } from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fork } from "radashi";
import { useState } from "react";

import { FilePreviewCard } from "./file-preview-card";
import { FilePreviewListItem } from "./file-preview-list-item";
import { FolderPreviewListItem } from "./folder-preview-list-item";
import { Button } from "./ui/button";

interface FilesGridProps {
  alignEnd?: boolean;
  compact?: boolean;
  files: ProjectFileViewerFile[];
  folders?: SessionMessageDataPart.FolderAttachmentDataPart[];
  initialVisibleCount?: number;
}

const DEFAULT_INITIAL_VISIBLE_COUNT = 6;

export function FilesGrid({
  alignEnd = false,
  compact = false,
  files,
  folders = [],
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE_COUNT,
}: FilesGridProps) {
  const openFileViewer = useSetAtom(openProjectFileViewerAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScriptsExpanded, setIsScriptsExpanded] = useState(false);
  const [isInputsExpanded, setIsInputsExpanded] = useState(false);

  const [outputFiles, nonOutputFiles] = fork(files, isOutputFile);
  const [scriptFiles, nonScriptFiles] = fork(nonOutputFiles, isScriptFile);
  const [inputFiles, regularFiles] = fork(nonScriptFiles, isInputFile);

  const sortedOutputFiles = sortByRichPreview(outputFiles);
  const sortedRegularFiles = sortByRichPreview(regularFiles);

  const handleFileClick = (
    file: ProjectFileViewerFile,
    galleryFiles: ProjectFileViewerFile[],
  ) => {
    const currentIndex = galleryFiles.findIndex((f) => f.url === file.url);
    openFileViewer({
      currentIndex: currentIndex === -1 ? 0 : currentIndex,
      files: galleryFiles,
    });
  };

  const mainGalleryFiles = [...sortedOutputFiles, ...sortedRegularFiles];

  const visibleOutputFiles = sortedOutputFiles.slice(0, initialVisibleCount);
  const hasMoreFiles =
    sortedOutputFiles.length > initialVisibleCount ||
    sortedRegularFiles.length > 0 ||
    scriptFiles.length > 0 ||
    inputFiles.length > 0;

  const expandedFiles = [
    ...sortedOutputFiles.slice(initialVisibleCount),
    ...sortedRegularFiles,
  ];

  const mainFilesToShow = isExpanded
    ? [...sortedOutputFiles, ...sortedRegularFiles]
    : visibleOutputFiles;

  const richPreviewFiles = mainFilesToShow.filter(hasRichPreview);
  const otherFiles = mainFilesToShow.filter((file) => !hasRichPreview(file));

  const isSingleRichFile = !compact && richPreviewFiles.length === 1;

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div
            className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}
          >
            {richPreviewFiles.map((file) => {
              const shouldSpanTwoThirds =
                !compact && (isSingleRichFile || isReadableText(file));

              return (
                <div
                  className={cn(
                    "w-full shrink-0 grow-0",
                    isSingleRichFile
                      ? "@md:w-[calc((100%/3*2)-(0.5rem/3))]"
                      : "@md:w-[calc((100%/2)-(0.5rem/2))]",
                    shouldSpanTwoThirds
                      ? "@2xl:w-[calc((100%/3*2)-(0.5rem/3))]"
                      : "@2xl:w-[calc((100%/3)-(0.5rem*2/3))]",
                  )}
                  key={file.filePath}
                >
                  <FilePreviewCard
                    file={file}
                    onClick={() => {
                      handleFileClick(file, mainGalleryFiles);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(otherFiles.length > 0 || folders.length > 0) && (
        <div
          className={cn(
            "flex flex-wrap items-start gap-2",
            alignEnd && "justify-end",
          )}
        >
          {folders.map((folder) => (
            <div className="h-12 min-w-0" key={folder.id}>
              <FolderPreviewListItem folder={folder} />
            </div>
          ))}
          {otherFiles.map((file) => (
            <div className="h-12 min-w-0" key={file.filePath}>
              <FilePreviewListItem
                file={file}
                onClick={() => {
                  handleFileClick(file, mainGalleryFiles);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {!isExpanded && hasMoreFiles && (
        <div className={cn("flex", alignEnd ? "justify-end" : "justify-start")}>
          <Button
            onClick={() => {
              setIsExpanded(true);
            }}
            size="sm"
            type="button"
            variant="outline-muted"
          >
            <span className="text-xs">
              +{expandedFiles.length + scriptFiles.length + inputFiles.length}{" "}
              more
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      )}

      {isExpanded && scriptFiles.length > 0 && (
        <CategorizedFileSection
          alignEnd={alignEnd}
          files={scriptFiles}
          isExpanded={isScriptsExpanded}
          onFileClick={handleFileClick}
          onToggle={() => {
            setIsScriptsExpanded(!isScriptsExpanded);
          }}
          title="Scripts"
        />
      )}

      {isExpanded && inputFiles.length > 0 && (
        <CategorizedFileSection
          alignEnd={alignEnd}
          files={inputFiles}
          isExpanded={isInputsExpanded}
          onFileClick={handleFileClick}
          onToggle={() => {
            setIsInputsExpanded(!isInputsExpanded);
          }}
          title="Input Files"
        />
      )}

      {isExpanded && (
        <div className={cn("flex", alignEnd ? "justify-end" : "justify-start")}>
          <Button
            onClick={() => {
              setIsExpanded(false);
              setIsScriptsExpanded(false);
              setIsInputsExpanded(false);
            }}
            size="sm"
            type="button"
            variant="outline-muted"
          >
            <span className="text-xs">Show less</span>
            <ChevronUp className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CategorizedFileSection({
  alignEnd,
  files,
  isExpanded,
  onFileClick,
  onToggle,
  title,
}: {
  alignEnd: boolean;
  files: ProjectFileViewerFile[];
  isExpanded: boolean;
  onFileClick: (
    file: ProjectFileViewerFile,
    galleryFiles: ProjectFileViewerFile[],
  ) => void;
  onToggle: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/30 p-2">
      <button
        className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={onToggle}
        type="button"
      >
        {isExpanded ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )}
        <span>
          {title} ({files.length})
        </span>
      </button>

      {isExpanded && (
        <div
          className={cn(
            "flex flex-wrap items-start gap-2",
            alignEnd && "justify-end",
          )}
        >
          {files.map((file) => (
            <div className="h-12 min-w-0" key={file.filePath}>
              <FilePreviewListItem
                file={file}
                onClick={() => {
                  onFileClick(file, files);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hasRichPreview(file: ProjectFileViewerFile) {
  const fileType = getFileType(file);
  return (
    fileType === "image" ||
    fileType === "html" ||
    fileType === "pdf" ||
    fileType === "video" ||
    fileType === "markdown" ||
    fileType === "text"
  );
}

function isInputFile(file: ProjectFileViewerFile) {
  return (
    file.filePath.startsWith(`${APP_FOLDER_NAMES.agentRetrieved}/`) ||
    file.filePath.startsWith(`${APP_FOLDER_NAMES.userProvided}/`)
  );
}

function isOutputFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.output}/`);
}

function isScriptFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.scripts}/`);
}

function sortByRichPreview(files: ProjectFileViewerFile[]) {
  const [rich, nonRich] = fork(files, hasRichPreview);
  return [...rich, ...nonRich];
}
