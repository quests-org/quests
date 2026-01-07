import type { ProjectSubdomain } from "@quests/workspace/client";

import { useAppState } from "@/client/hooks/use-app-state";
import {
  getToolLabel,
  getToolStreamingLabel,
  TOOL_ICONS,
} from "@/client/lib/tool-display";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { getToolNameByType, isToolPart } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  GitCommitVertical,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

export function SessionStatusPreview({
  subdomain,
}: {
  subdomain: ProjectSubdomain;
}) {
  const { data: sessions = [], isPending } = useQuery({
    ...rpcClient.workspace.session.live.list.experimental_liveOptions({
      input: { subdomain },
    }),
  });

  const latestSession = sessions.at(-1);

  if (isPending) {
    return null;
  }

  if (!latestSession) {
    return <StatusBadge text="Idle" />;
  }

  return (
    <SessionStatusText sessionId={latestSession.id} subdomain={subdomain} />
  );
}

function SessionStatusText({
  sessionId,
  subdomain,
}: {
  sessionId: string;
  subdomain: ProjectSubdomain;
}) {
  const { data: messages = [] } = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      input: { sessionId, subdomain },
    }),
  );

  const { data: appState } = useAppState({ subdomain });

  const sessionActors = appState?.sessionActors ?? [];
  const isAgentAlive = sessionActors.some((actor) =>
    actor.tags.includes("agent.alive"),
  );

  const nonSystemMessages = messages.filter(
    (msg) => msg.role !== "session-context",
  );
  const latestMessage = nonSystemMessages.at(-1);

  if (!latestMessage || latestMessage.parts.length === 0) {
    return (
      <StatusBadge
        animate={isAgentAlive}
        text={isAgentAlive ? "Working..." : "Done"}
      />
    );
  }

  const relevantParts = latestMessage.parts.filter(
    (part) =>
      part.type !== "step-start" &&
      part.type !== "source-url" &&
      part.type !== "source-document",
  );
  const latestPart = relevantParts.at(-1);

  if (!latestPart) {
    return (
      <StatusBadge
        animate={isAgentAlive}
        text={isAgentAlive ? "Working..." : "Done"}
      />
    );
  }

  let displayText: string;
  let shouldAnimate = false;
  let Icon: null | React.ComponentType<{ className?: string }> = null;

  if (latestPart.type === "text") {
    const textContent = latestPart.text.trim();
    displayText = textContent;
    Icon = MessageSquare;
  } else if (latestPart.type === "data-gitCommit") {
    displayText = "Version";
    Icon = GitCommitVertical;
  } else if (isToolPart(latestPart)) {
    const toolName = getToolNameByType(latestPart.type);
    Icon = TOOL_ICONS[toolName] ?? HelpCircle;

    if (latestPart.state === "output-available") {
      displayText = getToolLabel(toolName);
    } else if (latestPart.state === "output-error") {
      displayText = "Error";
    } else {
      displayText = getToolStreamingLabel(toolName, false);
      shouldAnimate = isAgentAlive;
    }
  } else if (latestPart.type === "reasoning") {
    displayText = isAgentAlive ? "Thinking" : "Thought";
    Icon = Brain;
    shouldAnimate = isAgentAlive;
  } else {
    displayText = `[${latestPart.type}]`;
  }

  return (
    <StatusBadge
      animate={shouldAnimate}
      icon={Icon ?? undefined}
      text={displayText}
    />
  );
}

function StatusBadge({
  animate = false,
  icon: Icon,
  text,
}: {
  animate?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-accent/30 px-2 py-0.5">
      {Icon && <Icon className="size-3 shrink-0 text-muted-foreground/60" />}
      <span
        className={cn(
          "min-w-0 truncate text-xs wrap-break-word text-muted-foreground",
          animate && "shiny-text",
        )}
      >
        {text}
      </span>
    </div>
  );
}
