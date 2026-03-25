import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { getFileType, isReadableText } from "@/client/lib/get-file-type";
import { cn } from "@/client/lib/utils";
import { APP_FOLDER_NAMES } from "@quests/workspace/client";
import { type SessionMessageDataPart } from "@quests/workspace/client";
import { useNavigate } from "@tanstack/react-router";
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

type SupportingSectionKey =
  | "agentRetrieved"
  | "scripts"
  | "skills"
  | "temporary"
  | "uploaded";

const DEFAULT_INITIAL_VISIBLE_COUNT = 6;
const EMPTY_FOLDERS: SessionMessageDataPart.FolderAttachmentDataPart[] = [];
const EMPTY_EXPANDED_SECTIONS: Record<SupportingSectionKey, boolean> = {
  agentRetrieved: false,
  scripts: false,
  skills: false,
  temporary: false,
  uploaded: false,
};
const EXPANDED_SECTIONS: Record<SupportingSectionKey, boolean> = {
  agentRetrieved: true,
  scripts: true,
  skills: true,
  temporary: true,
  uploaded: true,
};

export function FilesGrid({
  alignEnd = false,
  compact = false,
  files,
  folders = EMPTY_FOLDERS,
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE_COUNT,
  prioritizeUserFiles = false,
}: FilesGridProps) {
  const navigate = useNavigate({ from: "/projects/$subdomain" });
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState(
    EMPTY_EXPANDED_SECTIONS,
  );

  const [outputFiles, nonOutputFiles] = fork(files, isOutputFile);
  const [supportingFilesByKey, regularFiles] =
    splitSupportingFiles(nonOutputFiles);
  const userProvidedFiles = supportingFilesByKey.uploaded;

  const sortedOutputFiles = sortByRichPreview(outputFiles);
  const sortedRegularFiles = sortByRichPreview(regularFiles);
  const sortedUserProvidedFiles = sortByRichPreview(userProvidedFiles);

  const handleFileClick = (file: ProjectFileViewerFile) => {
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        artifactPanel: {
          filePath: file.filePath,
          fileVersion: file.versionRef,
          type: "file",
        },
      }),
    });
  };

  const mainFiles = prioritizeUserFiles
    ? [...sortedUserProvidedFiles, ...sortedOutputFiles, ...sortedRegularFiles]
    : [...sortedOutputFiles, ...sortedRegularFiles];

  const visibleMainFiles = mainFiles.slice(0, initialVisibleCount);
  const collapsedUserProvidedFiles = prioritizeUserFiles
    ? []
    : userProvidedFiles;
  const supportingSections = [
    {
      files: supportingFilesByKey.scripts,
      key: "scripts" as const,
      title: "Scripts",
    },
    {
      files: supportingFilesByKey.skills,
      key: "skills" as const,
      title: "Skills",
    },
    {
      files: supportingFilesByKey.temporary,
      key: "temporary" as const,
      title: "Temporary",
    },
    {
      files: collapsedUserProvidedFiles,
      key: "uploaded" as const,
      title: "Uploaded",
    },
    {
      files: supportingFilesByKey.agentRetrieved,
      key: "agentRetrieved" as const,
      title: "Agent Retrieved",
    },
  ];
  const supportingFileCount = supportingSections.reduce((count, section) => {
    return count + section.files.length;
  }, 0);

  const hasMoreFiles =
    mainFiles.length > initialVisibleCount || supportingFileCount > 0;

  const expandedFiles = mainFiles.slice(initialVisibleCount);

  const hiddenFileCount = expandedFiles.length + supportingFileCount;

  const mainFilesToShow = isExpanded ? mainFiles : visibleMainFiles;

  const richPreviewFiles = compact
    ? []
    : mainFilesToShow.filter(hasRichPreview);
  const otherFiles = compact
    ? mainFilesToShow
    : mainFilesToShow.filter((file) => !hasRichPreview(file));

  const isSingleRichFile = richPreviewFiles.length === 1;

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div
            className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}
          >
            {richPreviewFiles.map((file) => {
              const shouldSpan = isSingleRichFile || isReadableText(file);

              return (
                <div
                  className={cn(
                    "shrink-0 grow-0",
                    isSingleRichFile
                      ? "w-full @md:w-[calc((100%/3*2)-(0.5rem/3))]"
                      : "w-[calc((100%/2)-(0.5rem/2))]",
                    shouldSpan
                      ? "@2xl:w-[calc((100%/3*2)-(0.5rem/3))]"
                      : "@2xl:w-[calc((100%/3)-(0.5rem*2/3))]",
                  )}
                  key={file.filePath}
                >
                  <FilePreviewCard
                    file={file}
                    onClick={() => {
                      handleFileClick(file);
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
                  handleFileClick(file);
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
                setExpandedSections(EXPANDED_SECTIONS);
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

      {isExpanded &&
        supportingSections.map((section) => {
          if (section.files.length === 0) {
            return null;
          }

          return (
            <CategorizedFileSection
              alignEnd={alignEnd}
              files={section.files}
              isExpanded={expandedSections[section.key]}
              key={section.key}
              onFileClick={handleFileClick}
              onToggle={() => {
                setExpandedSections((prev) => ({
                  ...prev,
                  [section.key]: !prev[section.key],
                }));
              }}
              title={section.title}
            />
          );
        })}

      {isExpanded && (
        <div className={cn("flex", alignEnd ? "justify-end" : "justify-start")}>
          <Button
            onClick={() => {
              setIsExpanded(false);
              setExpandedSections(EMPTY_EXPANDED_SECTIONS);
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
  onFileClick: (file: ProjectFileViewerFile) => void;
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
                  onFileClick(file);
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

function isSkillFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.skills}/`);
}

function isTempFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith("tmp/");
}

function isUserProvidedFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.userProvided}/`);
}

function sortByRichPreview(files: ProjectFileViewerFile[]) {
  const [rich, nonRich] = fork(files, hasRichPreview);
  return [...rich, ...nonRich];
}

function splitSupportingFiles(files: ProjectFileViewerFile[]) {
  const supportingFilesByKey: Record<
    SupportingSectionKey,
    ProjectFileViewerFile[]
  > = {
    agentRetrieved: [],
    scripts: [],
    skills: [],
    temporary: [],
    uploaded: [],
  };

  let remainingFiles = files;
  const matchingOrder: {
    key: SupportingSectionKey;
    matches: (file: ProjectFileViewerFile) => boolean;
  }[] = [
    { key: "scripts", matches: isScriptFile },
    { key: "skills", matches: isSkillFile },
    { key: "temporary", matches: isTempFile },
    { key: "uploaded", matches: isUserProvidedFile },
    { key: "agentRetrieved", matches: isAgentRetrievedFile },
  ];

  for (const { key, matches } of matchingOrder) {
    const [matchedFiles, unmatchedFiles] = fork(remainingFiles, matches);
    supportingFilesByKey[key] = matchedFiles;
    remainingFiles = unmatchedFiles;
  }

  return [supportingFilesByKey, remainingFiles] as const;
}
