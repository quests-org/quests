import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type ProjectSubdomain, type StoreId } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";

export function useContinueSession({
  modelURI,
  onSuccess,
  sessionId,
  subdomain,
}: {
  modelURI: AIGatewayModelURI.Type | undefined;
  onSuccess?: () => void;
  sessionId: StoreId.Session | undefined;
  subdomain: ProjectSubdomain;
}) {
  const createMessage = useMutation(
    rpcClient.workspace.message.create.mutationOptions(),
  );

  const handleContinue = () => {
    if (!sessionId || !modelURI) {
      return;
    }

    createMessage.mutate(
      {
        modelURI,
        prompt: "Continue.",
        sessionId,
        subdomain,
      },
      { onSuccess },
    );
  };

  return { handleContinue, isPending: createMessage.isPending };
}
