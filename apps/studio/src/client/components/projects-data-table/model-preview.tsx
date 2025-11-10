import type { ProjectSubdomain } from "@quests/workspace/client";

import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

export function ModelPreview({ subdomain }: { subdomain: ProjectSubdomain }) {
  const { data: projectState } = useQuery(
    rpcClient.workspace.project.state.get.queryOptions({
      input: { subdomain },
    }),
  );

  const { data: modelsResponse } = useQuery(
    rpcClient.gateway.models.list.queryOptions(),
  );

  if (!projectState?.selectedModelURI) {
    return <span className="text-xs text-muted-foreground">No model</span>;
  }

  const selectedModelURI = projectState.selectedModelURI;
  const models = modelsResponse?.models ?? [];

  const matchedModel = models.find((model) => model.uri === selectedModelURI);

  const displayName = matchedModel
    ? matchedModel.name
    : (selectedModelURI.split("?")[0] ?? "");

  return (
    <span className="text-xs bg-accent/30 px-2 py-0.5 rounded-full text-muted-foreground">
      {displayName}
    </span>
  );
}
