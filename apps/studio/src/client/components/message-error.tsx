import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { QUESTS_AUTO_MODEL_PROVIDER_ID } from "@quests/shared";
import { type SessionMessage } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  parseQuestsApiError,
  requiresAutoModelRecovery,
} from "../lib/parse-quests-api-error";
import { rpcClient } from "../rpc/client";
import {
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
} from "./collapsible-part";
import { DeveloperModeBadge } from "./tool-part/developer-mode-badge";
import { ToolPartListItemCompact } from "./tool-part/list-item-compact";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UpgradeSubscriptionAlert } from "./upgrade-subscription-alert";

interface MessageErrorProps {
  isAgentRunning: boolean;
  isDeveloperMode: boolean;
  isLastMessage: boolean;
  message: SessionMessage.Assistant;
  onContinue: () => void;
  onModelChange: (modelURI: AIGatewayModelURI.Type) => void;
  onRetry: (prompt: string) => void;
  onStartNewChat?: () => void;
}

export function MessageError({
  isAgentRunning,
  isDeveloperMode,
  isLastMessage,
  message,
  onContinue,
  onModelChange,
  onRetry,
  onStartNewChat,
}: MessageErrorProps) {
  const error = message.metadata.error;
  const showActions = isLastMessage && !isAgentRunning;
  const defaultExpanded = isLastMessage && !isAgentRunning;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { data: modelsData } = useQuery(
    rpcClient.gateway.models.live.list.experimental_liveOptions(),
  );
  const { models } = modelsData ?? {};

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  if (!error) {
    return null;
  }

  const isAborted = error.kind === "aborted";
  const questsError = parseQuestsApiError(message);
  const isStaleInsufficientCredits =
    questsError?.code === "insufficient-credits" && !isLastMessage;

  // Normally hidden errors are still shown in developer mode via the generic renderer
  const isDevOnlyVisible =
    isDeveloperMode && (isAborted || isStaleInsufficientCredits);

  if (!isDevOnlyVisible) {
    // Hide old or useless errors for non-developer mode
    if (isAborted || isStaleInsufficientCredits) {
      return null;
    }

    if (questsError?.code === "insufficient-credits") {
      return <UpgradeSubscriptionAlert onContinue={onContinue} />;
    }
  }

  if (showActions && questsError && requiresAutoModelRecovery(message)) {
    const autoModel = models?.find(
      (m) => m.providerId === QUESTS_AUTO_MODEL_PROVIDER_ID,
    );

    return (
      <Alert>
        <AlertTitle>Model unavailable</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{questsError.message || error.message}</span>
          {autoModel && (
            <div className="flex">
              <Button
                onClick={() => {
                  onModelChange(autoModel.uri);
                  toast.success("Switched to Auto model");
                }}
                size="sm"
              >
                Switch to Auto Mode
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const getErrorTitle = () => {
    switch (error.kind) {
      case "api-call":
      case "api-key":
      case "invalid-tool-input":
      case "no-such-tool": {
        return "Model Error";
      }
      default: {
        return "Error";
      }
    }
  };

  const getErrorTypeLabel = () => {
    switch (error.kind) {
      case "api-call": {
        return "API Call Error";
      }
      case "api-key": {
        return "API Key Error";
      }
      case "invalid-tool-input": {
        return "Invalid Tool Input";
      }
      case "no-such-tool": {
        return "Tool Not Found";
      }
      case "unknown": {
        return "Unknown Error";
      }
      default: {
        return "Error";
      }
    }
  };

  const mainContent = (
    <ToolPartListItemCompact isExpanded={isExpanded}>
      {isDevOnlyVisible && <DeveloperModeBadge />}
      <span className="shrink-0 text-warning-foreground/80">
        <AlertTriangle className="size-3" />
      </span>
      <span className="shrink-0 font-medium text-warning-foreground/80">
        {getErrorTitle()}
      </span>
      <span className="flex-1" />
      <span className="shrink-0 text-warning-foreground/60">
        {getErrorTypeLabel()}
      </span>
    </ToolPartListItemCompact>
  );

  return (
    <div className="w-full">
      <Collapsible
        className="w-full"
        onOpenChange={setIsExpanded}
        open={isExpanded}
      >
        <CollapsibleTrigger asChild>
          <CollapsiblePartTrigger>{mainContent}</CollapsiblePartTrigger>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CollapsiblePartMainContent>
            <div className="mb-2">
              <div className="mb-1 font-semibold">Error:</div>
              <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {error.message}
              </pre>
            </div>

            {error.kind === "api-call" && (
              <div className="space-y-1">
                <div>
                  <strong>API:</strong> {error.name}
                </div>
                <div className="break-all">
                  <strong>URL:</strong> {error.url}
                </div>
                {error.statusCode && (
                  <div>
                    <strong>Status:</strong> {error.statusCode}
                  </div>
                )}
                {error.responseBody && (
                  <div>
                    <strong>Response:</strong>
                    <pre className="mt-1 max-h-32 overflow-y-auto rounded-sm bg-muted p-2 text-xs wrap-break-word whitespace-pre-wrap">
                      {error.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {error.kind === "invalid-tool-input" && (
              <div>
                <div className="mb-1 font-semibold">Input:</div>
                <pre className="max-h-32 overflow-y-auto rounded-sm border bg-muted p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                  {error.input}
                </pre>
              </div>
            )}

            {error.kind === "no-such-tool" && (
              <div>
                <strong>Tool:</strong> {error.toolName}
              </div>
            )}

            {showActions && onStartNewChat && !questsError && (
              <div className="mt-4 flex gap-2 border-t pt-4">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onStartNewChat}
                      size="sm"
                      variant="outline"
                    >
                      Start new chat
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Starts a fresh chat in this project</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  onClick={() => {
                    onRetry("Try that again.");
                  }}
                  size="sm"
                >
                  Try again
                </Button>
              </div>
            )}
          </CollapsiblePartMainContent>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
