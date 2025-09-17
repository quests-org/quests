import { cn } from "@/client/lib/utils";
import { type ProjectSubdomain } from "@quests/workspace/client";

import { InternalLink } from "./internal-link";
import {
  VersionCommitMessage,
  VersionFileChanges,
  VersionHeader,
  VersionRestoredFooter,
} from "./version-info";
import { ViewIndicator } from "./view-indicator";

interface GitCommitCardProps {
  disableBorder?: boolean;
  disableLink?: boolean;
  isLastGitCommit?: boolean;
  isSelected?: boolean;
  projectSubdomain: ProjectSubdomain;
  restoredFromRef?: string;
  showCommitMessage?: boolean;
  showFullCommitMessage?: boolean;
  versionRef: string;
}

export function GitCommitCard({
  disableBorder = false,
  disableLink = false,
  isLastGitCommit = false,
  isSelected = false,
  projectSubdomain,
  restoredFromRef,
  showCommitMessage = true,
  showFullCommitMessage = false,
  versionRef,
}: GitCommitCardProps) {
  // For the last commit when no version is selected (implicitly selected),
  // we don't want to set a version when clicked
  const shouldSetVersion = !isSelected && !isLastGitCommit;
  const showViewIndicator = !disableLink;

  const cardContent = (
    <div
      className={cn(
        "text-card-foreground flex flex-col gap-6 rounded-lg border py-0 shadow-sm overflow-hidden bg-card",
        "p-3 transition-colors relative",
        !disableLink &&
          (isSelected
            ? "border-secondary-foreground hover:bg-muted/30"
            : "hover:bg-muted/50"),
        disableLink && "border-border",
        disableBorder && "border-0",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <VersionHeader
            isCurrentVersion={isLastGitCommit}
            versionRef={versionRef}
          />

          {showViewIndicator && <ViewIndicator isSelected={isSelected} />}
        </div>

        {showCommitMessage && (
          <VersionCommitMessage
            projectSubdomain={projectSubdomain}
            showFullMessage={showFullCommitMessage}
            versionRef={versionRef}
          />
        )}

        <VersionFileChanges
          projectSubdomain={projectSubdomain}
          versionRef={versionRef}
        />

        {restoredFromRef && (
          <VersionRestoredFooter
            projectSubdomain={projectSubdomain}
            restoredFromRef={restoredFromRef}
          />
        )}
      </div>
    </div>
  );

  if (disableLink) {
    return cardContent;
  }

  return (
    <InternalLink
      allowOpenNewTab={false}
      from="/projects/$subdomain"
      params={{ subdomain: projectSubdomain }}
      search={(prev) => ({
        ...prev,
        selectedVersion: shouldSetVersion ? versionRef : undefined,
      })}
    >
      {cardContent}
    </InternalLink>
  );
}
