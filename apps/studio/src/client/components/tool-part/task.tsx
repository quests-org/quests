import {
  getToolNameByType,
  type SessionMessage,
  type SessionMessagePart,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { getToolLabelForPart } from "../../lib/tool-display";
import { cn } from "../../lib/utils";
import { rpcClient } from "../../rpc/client";
import {
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
} from "../collapsible-part";
import { ToolIcon } from "../tool-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ToolPartListItemCompact } from "./list-item-compact";

export type RenderStream = (args: {
  isAgentRunning: boolean;
  messages: SessionMessage.WithParts[];
}) => ReactNode;

export function TaskToolCard({
  isLoading,
  part,
  project,
  renderStream,
}: {
  isLoading: boolean;
  part: Extract<SessionMessagePart.ToolPart, { type: "tool-task" }>;
  project: WorkspaceAppProject;
  renderStream: RenderStream;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = getToolNameByType(part.type);
  const isError = part.state === "output-error";
  const isSuccess = part.state === "output-available";
  const isTaskRunning =
    isLoading && isSuccess && part.output.status === "running";
  const isExpandable = isSuccess || isError;
  const isOpen = isExpanded || isTaskRunning;

  const label = getToolLabelForPart({
    part,
    state: isLoading ? "streaming" : isError ? "failed" : "completed",
    toolName,
  });

  const value =
    isLoading || isTaskRunning
      ? (part.input?.subagent_type ?? "")
      : isError
        ? part.errorText || ""
        : isSuccess && part.output.status === "done"
          ? part.output.summary
          : "";

  const header = (
    <ToolPartListItemCompact
      icon={
        isLoading ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <ToolIcon className="size-3" toolName={toolName} />
        )
      }
      isExpanded={isExpandable && isOpen}
      label={label}
      labelClassName={cn(isLoading && "shiny-text")}
      value={value}
    />
  );

  if (isTaskRunning) {
    return (
      <div className="w-full rounded-md bg-muted/40">
        <div className="flex h-6 items-center px-1">{header}</div>
        <TaskStream
          isRunning
          project={project}
          renderStream={renderStream}
          sessionId={part.output.sessionId}
        />
      </div>
    );
  }

  if (!isExpandable) {
    return (
      <div className="w-full">
        <div className="flex h-6 items-center px-1">{header}</div>
      </div>
    );
  }

  return (
    <Collapsible className="w-full" onOpenChange={setIsExpanded} open={isOpen}>
      <CollapsibleTrigger asChild>
        <CollapsiblePartTrigger>{header}</CollapsiblePartTrigger>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isSuccess && (
          <CollapsiblePartMainContent>
            <TaskStream
              isRunning={false}
              project={project}
              renderStream={renderStream}
              sessionId={part.output.sessionId}
            />
          </CollapsiblePartMainContent>
        )}
        {isError && (
          <CollapsiblePartMainContent>
            <div className="mb-1 font-semibold">Error:</div>
            <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {part.errorText}
            </pre>
          </CollapsiblePartMainContent>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TaskStream({
  isRunning,
  project,
  renderStream,
  sessionId,
}: {
  isRunning: boolean;
  project: WorkspaceAppProject;
  renderStream: RenderStream;
  sessionId: string;
}) {
  const {
    data: messages,
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      input: {
        sessionId,
        subdomain: project.subdomain,
      },
    }),
  );

  const { contentRef, scrollRef } = useStickToBottom({ mass: 0.8 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading messages: {error.message}
      </div>
    );
  }

  if (isRunning) {
    return (
      <div
        className="p-2"
        ref={scrollRef}
        style={{ height: "300px", overflowY: "auto" }}
      >
        <div ref={contentRef}>
          {renderStream({ isAgentRunning: true, messages: messages ?? [] })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {renderStream({ isAgentRunning: false, messages: messages ?? [] })}
    </div>
  );
}
