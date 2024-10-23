import { cn } from "@/client/lib/utils";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import {
  VersionCommitMessage,
  VersionFileChanges,
  VersionHeader,
  VersionRestoredFooter,
} from "./version-info";

interface GitCommitCardProps {
  disableLink?: boolean;
  isLastGitCommit?: boolean;
  isSelected?: boolean;
  projectSubdomain: ProjectSubdomain;
  restoredFromRef?: string;
  showCommitMessage?: boolean;
  versionRef: string;
}

export function GitCommitCard({
  disableLink = false,
  isLastGitCommit = false,
  isSelected = false,
  projectSubdomain,
  restoredFromRef,
  showCommitMessage = true,
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
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <VersionHeader
            isCurrentVersion={isLastGitCommit}
            versionRef={versionRef}
          />

          {showViewIndicator && (
            <div className="shrink-0">
              {isSelected ? (
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  Viewing
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                  <span className="font-medium">View</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </div>
          )}
        </div>

        {showCommitMessage && (
          <VersionCommitMessage
            projectSubdomain={projectSubdomain}
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
    <Link
      from="/projects/$subdomain"
      params={{ subdomain: projectSubdomain }}
      search={(prev) => ({
        ...prev,
        selectedVersion: shouldSetVersion ? versionRef : undefined,
      })}
    >
      {cardContent}
    </Link>
  );
}
