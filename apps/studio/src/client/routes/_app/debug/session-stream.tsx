import { SessionStream } from "@/client/components/session-stream";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import { Label } from "@/client/components/ui/label";
import { cn } from "@/client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { presetSessions } from "./-sessions";

const searchSchema = z.object({
  session: z.string().optional(),
});

export const Route = createFileRoute("/_app/debug/session-stream")({
  component: RouteComponent,
  validateSearch: searchSchema,
});

const createEventHandler = (eventName: string) => {
  return () => {
    toast.info(`${eventName} clicked`);
  };
};

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { session: sessionParam } = Route.useSearch();

  const selectedSessionId = sessionParam ?? presetSessions[0]?.id ?? "basic";

  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  const selectedSession = presetSessions.find(
    (s) => s.id === selectedSessionId,
  );

  const mockProject = {
    subdomain: "debug-project",
    urls: {
      assetBase: "",
    },
  };

  return (
    <div className="grid size-full grid-cols-[300px_1fr] gap-4 overflow-hidden p-4">
      <Command
        className="max-h-fit self-start rounded-lg border"
        value={selectedSessionId}
      >
        <CommandInput placeholder="Search sessions..." />
        <CommandList className="max-h-100">
          {presetSessions.map((session) => {
            const isSelected = selectedSessionId === session.id;
            return (
              <CommandItem
                key={session.id}
                onSelect={() => {
                  void navigate({
                    search: { session: session.id },
                  });
                }}
                value={session.id}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "truncate text-sm",
                    isSelected && "font-semibold",
                  )}
                >
                  {session.name}
                </span>
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>

      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-6 rounded-md border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAgentRunning}
              id="agent-running"
              onCheckedChange={(checked) => {
                setIsAgentRunning(checked === true);
              }}
            />
            <Label className="cursor-pointer text-sm" htmlFor="agent-running">
              Agent Running
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isDeveloperMode}
              id="developer-mode"
              onCheckedChange={(checked) => {
                setIsDeveloperMode(checked === true);
              }}
            />
            <Label className="cursor-pointer text-sm" htmlFor="developer-mode">
              Developer Mode
            </Label>
          </div>
        </div>
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Session Stream Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {selectedSession ? (
              <SessionStream
                isAgentRunning={isAgentRunning}
                messages={selectedSession.messages}
                onContinue={createEventHandler("Continue")}
                onModelChange={createEventHandler("Model Change")}
                onRetry={createEventHandler("Retry")}
                onStartNewChat={createEventHandler("Start New Chat")}
                project={mockProject as never}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a session to preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
