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
  prioritizeUserFiles?: boolean;
}

const DEFAULT_INITIAL_VISIBLE_COUNT = 6;
const EMPTY_FOLDERS: SessionMessageDataPart.FolderAttachmentDataPart[] = [];

export function FilesGrid({
  alignEnd = false,
  compact = false,
  files,
  folders = EMPTY_FOLDERS,
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE_COUNT,
  prioritizeUserFiles = false,
}: FilesGridProps) {
  const openFileViewer = useSetAtom(openProjectFileViewerAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScriptsExpanded, setIsScriptsExpanded] = useState(false);
  const [isUserProvidedExpanded, setIsUserProvidedExpanded] = useState(false);
  const [isAgentRetrievedExpanded, setIsAgentRetrievedExpanded] =
    useState(false);

  const [outputFiles, nonOutputFiles] = fork(files, isOutputFile);
  const [scriptFiles, nonScriptFiles] = fork(nonOutputFiles, isScriptFile);
  const [userProvidedFiles, nonUserProvidedFiles] = fork(
    nonScriptFiles,
    isUserProvidedFile,
  );
  const [agentRetrievedFiles, regularFiles] = fork(
    nonUserProvidedFiles,
    isAgentRetrievedFile,
  );

  const sortedOutputFiles = sortByRichPreview(outputFiles);
  const sortedRegularFiles = sortByRichPreview(regularFiles);
  const sortedUserProvidedFiles = sortByRichPreview(userProvidedFiles);

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

  const mainFiles = prioritizeUserFiles
    ? [...sortedUserProvidedFiles, ...sortedOutputFiles, ...sortedRegularFiles]
    : [...sortedOutputFiles, ...sortedRegularFiles];

  const mainGalleryFiles = mainFiles;

  const visibleMainFiles = mainFiles.slice(0, initialVisibleCount);
  const collapsedUserProvidedFiles = prioritizeUserFiles
    ? []
    : userProvidedFiles;

  const hasMoreFiles =
    mainFiles.length > initialVisibleCount ||
    scriptFiles.length > 0 ||
    collapsedUserProvidedFiles.length > 0 ||
    agentRetrievedFiles.length > 0;

  const expandedFiles = mainFiles.slice(initialVisibleCount);

  const hiddenFileCount =
    expandedFiles.length +
    scriptFiles.length +
    collapsedUserProvidedFiles.length +
    agentRetrievedFiles.length;

  const mainFilesToShow = isExpanded ? mainFiles : visibleMainFiles;

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
            <div className="h-12 max-w-48 min-w-0" key={folder.id}>
              <FolderPreviewListItem folder={folder} />
            </div>
          ))}
          {otherFiles.map((file) => (
            <div className="h-12 max-w-48 min-w-0" key={file.filePath}>
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
              if (
                outputFiles.length === 0 &&
                collapsedUserProvidedFiles.length === 0
              ) {
                setIsScriptsExpanded(true);
                setIsUserProvidedExpanded(true);
                setIsAgentRetrievedExpanded(true);
              }
            }}
            size="sm"
            type="button"
            variant="outline-muted"
          >
            {expandedFiles.length > 0 ? (
              <span className="text-xs">+{hiddenFileCount} more</span>
            ) : (
              <span className="text-xs">
                Show {hiddenFileCount} supporting file
                {hiddenFileCount === 1 ? "" : "s"}
              </span>
            )}
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

      {isExpanded && collapsedUserProvidedFiles.length > 0 && (
        <CategorizedFileSection
          alignEnd={alignEnd}
          files={collapsedUserProvidedFiles}
          isExpanded={isUserProvidedExpanded}
          onFileClick={handleFileClick}
          onToggle={() => {
            setIsUserProvidedExpanded(!isUserProvidedExpanded);
          }}
          title="Uploaded"
        />
      )}

      {isExpanded && agentRetrievedFiles.length > 0 && (
        <CategorizedFileSection
          alignEnd={alignEnd}
          files={agentRetrievedFiles}
          isExpanded={isAgentRetrievedExpanded}
          onFileClick={handleFileClick}
          onToggle={() => {
            setIsAgentRetrievedExpanded(!isAgentRetrievedExpanded);
          }}
          title="Agent Retrieved"
        />
      )}

      {isExpanded && (
        <div className={cn("flex", alignEnd ? "justify-end" : "justify-start")}>
          <Button
            onClick={() => {
              setIsExpanded(false);
              setIsScriptsExpanded(false);
              setIsUserProvidedExpanded(false);
              setIsAgentRetrievedExpanded(false);
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
            <div className="h-12 max-w-48 min-w-0" key={file.filePath}>
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

function isAgentRetrievedFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.agentRetrieved}/`);
}

function isOutputFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.output}/`);
}

function isScriptFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.scripts}/`);
}

function isUserProvidedFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.userProvided}/`);
}

function sortByRichPreview(files: ProjectFileViewerFile[]) {
  const [rich, nonRich] = fork(files, hasRichPreview);
  return [...rich, ...nonRich];
}
