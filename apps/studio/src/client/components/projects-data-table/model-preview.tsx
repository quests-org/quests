import type { ProjectSubdomain } from "@quests/workspace/client";

import { AIProviderIcon } from "@/client/components/ai-provider-icon";
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
    <span className="flex items-center gap-x-1 text-muted-foreground min-w-0">
      {matchedModel && (
        <AIProviderIcon
          className="size-3 shrink-0"
          type={matchedModel.params.provider}
        />
      )}
      <span className="truncate">{displayName}</span>
    </span>
  );
}
