import { type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { Badge } from "./ui/badge";

export function FileVersionBadge({
  className,
  filePath,
  projectSubdomain,
  versionRef,
}: {
  className?: string;
  filePath: string;
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}) {
  const { data: versionRefs } = useQuery(
    rpcClient.workspace.project.git.fileVersionRefs.queryOptions({
      input: {
        filePath,
        projectSubdomain,
      },
    }),
  );

  if (!versionRefs || versionRefs.length <= 1) {
    return null;
  }

  const versionNumber = versionRefs.indexOf(versionRef) + 1;

  // Version somehow doesn't exist yet, so we don't show anything
  if (versionNumber === 0) {
    return null;
  }

  return (
    <Badge className={className} variant="secondary">
      v{versionNumber}
    </Badge>
  );
}
