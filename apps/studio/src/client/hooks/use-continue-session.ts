import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type AgentName,
  type ProjectSubdomain,
  StoreId,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";

export function useContinueSession({
  agentName,
  modelURI,
  onSuccess,
  sessionId,
  subdomain,
}: {
  agentName: AgentName;
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

    const messageId = StoreId.newMessageId();
    const createdAt = new Date();

    createMessage.mutate(
      {
        agentName,
        message: {
          id: messageId,
          metadata: {
            createdAt,
            sessionId,
          },
          parts: [
            {
              metadata: {
                createdAt,
                id: StoreId.newPartId(),
                messageId,
                sessionId,
              },
              text: "Continue",
              type: "text",
            },
          ],
          role: "user",
        },
        modelURI,
        sessionId,
        subdomain,
      },
      { onSuccess },
    );
  };

  return { handleContinue, isPending: createMessage.isPending };
}
