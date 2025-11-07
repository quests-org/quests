import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { Breadcrumb } from "@/client/components/breadcrumb";
import { InternalLink } from "@/client/components/internal-link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useAppState } from "@/client/hooks/use-app-state";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import {
  getToolDisplayName,
  getToolIcon,
  getToolStreamingDisplayName,
} from "@/client/lib/tool-display";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import {
  getToolNameByType,
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  type SessionMessagePart,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Loader2, Square, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const evalsRunsSearchSchema = z.object({
  subdomains: z.string().optional(),
});

/* eslint-disable perfectionist/sort-objects */
export const Route = createFileRoute("/_app/evals/run")({
  validateSearch: evalsRunsSearchSchema,
  beforeLoad: ({ search }) => {
    const subdomains = search.subdomains
      ? search.subdomains.split(",").map((s) => ProjectSubdomainSchema.parse(s))
      : [];
    return { subdomains };
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Eval Run",
        },
        {
          content: "chart-line",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});
/* eslint-enable perfectionist/sort-objects */

function ProjectListItem({
  onDelete,
  onOpenInNewTab,
  onStop,
  project,
}: {
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onStop: (subdomain: ProjectSubdomain) => void;
  project: WorkspaceAppProject;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: appState } = useAppState({ subdomain: project.subdomain });

  const sessionActors = appState?.sessionActors ?? [];
  const isRunning = sessionActors.some((actor) =>
    actor.tags.includes("agent.alive"),
  );

  return (
    <>
      <Card className="hover:bg-accent/50 transition-colors py-0 gap-0 h-[88px]">
        <div className="flex items-start gap-x-3 px-4 py-4 h-full">
          <InternalLink
            className="flex flex-col gap-y-2 flex-1 min-w-0"
            openInCurrentTab
            params={{ subdomain: project.subdomain }}
            to="/projects/$subdomain"
          >
            <div className="flex items-center gap-x-2">
              {project.icon && (
                <SmallAppIcon
                  background={project.icon.background}
                  icon={project.icon.lucide}
                  size="sm"
                />
              )}
              <span className="font-medium truncate">{project.title}</span>
              <AppStatusIcon
                className="h-4 w-4 shrink-0"
                subdomain={project.subdomain}
              />
            </div>
            <div className="h-5 flex items-center">
              <SessionStatusPreview subdomain={project.subdomain} />
            </div>
          </InternalLink>
          <div className="flex items-center gap-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInNewTab(project.subdomain);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <ArrowUpRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
            {isRunning && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      onStop(project.subdomain);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Square className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteDialog(true);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                setShowDeleteDialog(false);
                onDelete(project.subdomain);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const { subdomains } = Route.useRouteContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: projectsData, isLoading } = useQuery({
    ...rpcClient.workspace.project.live.bySubdomains.experimental_liveOptions({
      input: { subdomains },
    }),
    enabled: !isDeleting,
  });

  const stopSessions = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());

  const { trashApp } = useTrashApp({ navigateOnDelete: false });

  const successfulProjects = projectsData?.filter((p) => p.ok) ?? [];
  const successfulSubdomains = successfulProjects.map((p) => p.data.subdomain);

  const { data: appStates } = useQuery(
    rpcClient.workspace.app.state.live.bySubdomains.experimental_liveOptions({
      input: { subdomains: successfulSubdomains },
    }),
  );

  const anyAgentAlive =
    appStates?.some((appState) => {
      const sessionActors = appState.sessionActors;
      return sessionActors.some((actor) => actor.tags.includes("agent.alive"));
    }) ?? false;

  if (isDeleting) {
    return (
      <div className="w-full max-w-3xl mx-auto px-8">
        <div className="sticky top-0 z-10 pt-8 pb-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Breadcrumb
            items={[{ label: "Evals", to: "/evals" }, { label: "Run" }]}
          />
        </div>
        <div className="flex items-center justify-center min-h-[50vh] gap-x-3">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Deleting projects...
          </span>
        </div>
      </div>
    );
  }

  const handleOpenInNewTab = (subdomain: ProjectSubdomain) => {
    addTab({ urlPath: `/projects/${subdomain}` });
  };

  const handleStopProject = async (subdomain: ProjectSubdomain) => {
    try {
      await stopSessions.mutateAsync({ subdomain });
      toast.success("Stopped project");
    } catch {
      toast.error("Failed to stop project");
    }
  };

  const handleDeleteProject = async (subdomain: ProjectSubdomain) => {
    try {
      await trashApp(subdomain);
      toast.success("Deleted project");

      const remainingSubdomains = subdomains.filter((s) => s !== subdomain);
      await (remainingSubdomains.length === 0
        ? navigate({ to: "/evals" })
        : navigate({
            replace: true,
            search: { subdomains: remainingSubdomains.join(",") },
            to: "/evals/run",
          }));
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleStopAll = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const result of successfulProjects) {
      try {
        await stopSessions.mutateAsync({ subdomain: result.data.subdomain });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(
        `Stopped ${successCount} ${successCount === 1 ? "project" : "projects"}`,
      );
    }

    if (failCount > 0) {
      toast.error(`Failed to stop ${failCount} projects`);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setShowDeleteDialog(false);
    let successCount = 0;
    let failCount = 0;

    for (const result of successfulProjects) {
      try {
        await trashApp(result.data.subdomain);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(
        `Deleted ${successCount} ${successCount === 1 ? "project" : "projects"}`,
      );
      await navigate({ to: "/evals" });
    } else {
      setIsDeleting(false);
    }

    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} projects`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (subdomains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-y-4">
        <p className="text-sm text-muted-foreground">No eval runs found</p>
      </div>
    );
  }

  const failedProjects = projectsData?.filter((p) => !p.ok) ?? [];

  return (
    <div className="w-full max-w-3xl mx-auto px-8">
      <div className="sticky top-0 z-10 pt-8 pb-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Breadcrumb
          items={[{ label: "Evals", to: "/evals" }, { label: "Run" }]}
        />
      </div>

      <div className="mb-6 flex items-start justify-between gap-x-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Eval Run</h1>
          <RunStatusDisplay projects={successfulProjects} />
        </div>
        {successfulProjects.length > 0 && (
          <div className="flex items-center gap-x-2">
            {anyAgentAlive && (
              <Button onClick={handleStopAll} size="sm" variant="outline">
                <Square className="size-4" />
                Stop All
              </Button>
            )}
            <Button
              onClick={() => {
                setShowDeleteDialog(true);
              }}
              size="sm"
              variant="outline"
            >
              <Trash2 className="size-4" />
              Delete All
            </Button>
          </div>
        )}
      </div>

      {failedProjects.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-destructive bg-destructive/10">
          <div className="flex items-center gap-x-2 mb-1">
            <XCircle className="size-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">
              Failed Projects
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {failedProjects.length} project
            {failedProjects.length === 1 ? "" : "s"} could not be found
          </p>
        </div>
      )}

      <div className="space-y-2">
        {successfulProjects.map((result) => {
          const project = result.data;
          return (
            <ProjectListItem
              key={project.subdomain}
              onDelete={handleDeleteProject}
              onOpenInNewTab={handleOpenInNewTab}
              onStop={handleStopProject}
              project={project}
            />
          );
        })}
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all projects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {successfulProjects.length}{" "}
              {successfulProjects.length === 1 ? "project" : "projects"}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteAll();
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunStatusDisplay({
  projects,
}: {
  projects: { data: WorkspaceAppProject; ok: true }[];
}) {
  return (
    <div className="text-sm text-muted-foreground">
      {projects.length} {projects.length === 1 ? "run" : "runs"}
    </div>
  );
}

function SessionStatusPreview({ subdomain }: { subdomain: ProjectSubdomain }) {
  const { data: sessions = [] } = useQuery(
    rpcClient.workspace.session.live.list.experimental_liveOptions({
      input: { subdomain },
    }),
  );

  const latestSession = sessions.at(-1);

  if (!latestSession) {
    return (
      <div className="inline-flex items-center gap-1.5 min-w-0 h-5 px-2 py-0.5 rounded-full bg-accent/30">
        <span className="text-xs text-muted-foreground leading-none">
          Ready
        </span>
      </div>
    );
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
    const text = isAgentAlive ? "Working..." : "Done";
    return (
      <div className="inline-flex items-center gap-1.5 min-w-0 h-5 px-2 py-0.5 rounded-full bg-accent/30">
        <span className="text-xs text-muted-foreground leading-none">
          {text}
        </span>
      </div>
    );
  }

  const relevantParts = latestMessage.parts.filter(
    (part) => !part.type.startsWith("data-") && part.type !== "step-start",
  );
  const latestPart = relevantParts.at(-1);

  if (!latestPart) {
    const text = isAgentAlive ? "Working..." : "Done";
    return (
      <div className="inline-flex items-center gap-1.5 min-w-0 h-5 px-2 py-0.5 rounded-full bg-accent/30">
        <span className="text-xs text-muted-foreground leading-none">
          {text}
        </span>
      </div>
    );
  }

  let displayText: string;
  let shouldAnimate = false;
  let Icon: null | React.ComponentType<{ className?: string }> = null;

  if (latestPart.type === "text") {
    displayText = latestPart.text;
  } else if (latestPart.type.startsWith("tool-")) {
    const toolPart = latestPart as SessionMessagePart.ToolPart;
    const toolName = getToolNameByType(toolPart.type);
    Icon = getToolIcon(toolName);

    if (toolPart.state === "output-available") {
      displayText = getToolDisplayName(toolName);
    } else if (toolPart.state === "output-error") {
      displayText = "Error";
    } else {
      displayText = getToolStreamingDisplayName(toolName);
      shouldAnimate = isAgentAlive;
    }
  } else if (latestPart.type === "reasoning") {
    displayText = "Thinking";
    shouldAnimate = isAgentAlive;
  } else {
    displayText = `[${latestPart.type}]`;
  }

  return (
    <div className="inline-flex items-center gap-1.5 min-w-0 h-5 px-2 py-0.5 rounded-full bg-accent/30">
      {Icon && <Icon className="size-3 shrink-0 text-muted-foreground/60" />}
      <span
        className={cn(
          "text-xs text-muted-foreground truncate leading-none",
          shouldAnimate && "shiny-text",
        )}
      >
        {displayText}
      </span>
    </div>
  );
}
