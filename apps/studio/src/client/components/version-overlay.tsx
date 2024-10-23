import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  VersionSubdomainSchema,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RotateCcw, X } from "lucide-react";
import { useRef, useState } from "react";

import { useShimIFrame } from "../lib/iframe-messenger";
import { rpcClient } from "../rpc/client";
import { AppIFrame } from "./app-iframe";
import { RestoreVersionModal } from "./restore-version-modal";
import { Button } from "./ui/button";
import { VersionCommitMessage, VersionHeader } from "./version-info";

interface VersionOverlayProps {
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

export function VersionOverlay({
  projectSubdomain,
  versionRef,
}: VersionOverlayProps) {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shimIFrame = useShimIFrame(iframeRef);
  const versionSubdomain = VersionSubdomainSchema.parse(
    `version-${versionRef}.${projectSubdomain}`,
  );

  const { data: app, isLoading } = useQuery(
    rpcClient.workspace.app.bySubdomain.queryOptions({
      input: { subdomain: versionSubdomain },
    }),
  );

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center space-y-6 px-6 py-8 bg-background/90 rounded-lg border shadow-lg">
          <div className="flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading version...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center space-y-6 px-6 py-8 bg-background/90 rounded-lg border shadow-lg">
          <p className="text-sm text-muted-foreground">Version not found</p>
          <Link
            className="text-sm text-primary hover:underline"
            from="/projects/$subdomain"
            params={{
              subdomain: ProjectSubdomainSchema.parse(projectSubdomain),
            }}
            search={(prev) => ({ ...prev, selectedVersion: undefined })}
          >
            Close
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex">
      <div className="w-full h-full bg-background/95 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-4 border-b bg-background/90 shrink-0">
          <div className="max-w-md min-w-0 flex flex-col gap-2">
            <VersionHeader versionRef={versionRef} />
            <VersionCommitMessage
              projectSubdomain={projectSubdomain}
              versionRef={versionRef}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setShowRestoreModal(true);
              }}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="size-4 mr-1" />
              Restore
            </Button>
            <Link
              className="p-1 hover:bg-muted rounded-md transition-colors"
              from="/projects/$subdomain"
              params={{
                subdomain: ProjectSubdomainSchema.parse(projectSubdomain),
              }}
              search={(prev) => ({ ...prev, selectedVersion: undefined })}
            >
              <X className="size-4" />
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <AppIFrame app={app} iframeRef={iframeRef} key={app.subdomain} />
        </div>
      </div>

      <RestoreVersionModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
        }}
        onRestore={shimIFrame.reloadWindow}
        projectSubdomain={projectSubdomain}
        versionRef={versionRef}
      />
    </div>
  );
}
