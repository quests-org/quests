import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useDefaultModelURI() {
  const { data: serverModelURI } = useQuery(
    rpcClient.preferences.live.defaultModelURI.experimental_liveOptions(),
  );
  const [localModelURI, setLocalModelURI] = useState<
    AIGatewayModelURI.Type | undefined
  >(undefined);
  const setDefaultModelMutation = useMutation(
    rpcClient.preferences.setDefaultModelURI.mutationOptions(),
  );

  const modelURI = localModelURI ?? serverModelURI;

  const setModelURI = (uri: AIGatewayModelURI.Type) => {
    setLocalModelURI(uri);
  };

  const saveModelURI = (uri: AIGatewayModelURI.Type) => {
    setDefaultModelMutation.mutate({ modelURI: uri });
  };

  return [modelURI, setModelURI, saveModelURI] as const;
}
