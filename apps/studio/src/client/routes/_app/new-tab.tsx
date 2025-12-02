import { agentNameAtom } from "@/client/atoms/agent-name";
import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { NewTabDiscoverHeroCards } from "@/client/components/discover-hero-card";
import { ExternalLink } from "@/client/components/external-link";
import { InternalLink } from "@/client/components/internal-link";
import { ModelPreview } from "@/client/components/projects-data-table/model-preview";
import { PromptInput } from "@/client/components/prompt-input";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Kbd } from "@/client/components/ui/kbd";
import { useTabActions } from "@/client/hooks/tabs";
import { createUserMessage } from "@/client/lib/create-user-message";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import {
  APP_REPO_URL,
  DISCORD_URL,
  NEW_ISSUE_URL,
  PRODUCT_NAME,
} from "@quests/shared";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useAtom } from "jotai";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/new-tab")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "New Tab",
      },
    ],
  }),
});

const WHATS_NEW_DISMISSED_KEY = "whats-new-dismissed-2025-12-02";

function RouteComponent() {
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const [agentName, setAgentName] = useAtom(agentNameAtom);
  const [isDismissed, setIsDismissed] = useState(() => {
    const stored = localStorage.getItem(WHATS_NEW_DISMISSED_KEY);
    return stored === "true";
  });
  const navigate = useNavigate({ from: "/new-tab" });
  const router = useRouter();
  const { addTab } = useTabActions();
  const createProjectMutation = useMutation(
    rpcClient.workspace.project.create.mutationOptions(),
  );

  const { data: projectsData } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions({
      input: { direction: "desc", limit: 6, sortBy: "updatedAt" },
    }),
  );

  const recentProjects = projectsData?.projects ?? [];
  const hasProjects = (projectsData?.projects.length ?? 0) > 0;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(WHATS_NEW_DISMISSED_KEY, "true");
  };

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col items-center relative">
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-36">
          <div>
            <PromptInput
              agentName={agentName}
              allowOpenInNewTab
              atomKey="$$new-tab$$"
              autoFocus
              autoResizeMaxHeight={300}
              isLoading={createProjectMutation.isPending}
              modelURI={selectedModelURI}
              onAgentChange={setAgentName}
              onModelChange={setSelectedModelURI}
              onSubmit={({
                agentName: submitAgentName,
                files,
                modelURI,
                openInNewTab,
                prompt,
              }) => {
                const sessionId = StoreId.newSessionId();
                const { files: mappedFiles, message } = createUserMessage({
                  files,
                  prompt,
                  sessionId,
                });

                createProjectMutation.mutate(
                  {
                    files: mappedFiles,
                    message,
                    mode: submitAgentName === "chat" ? "chat" : "app-builder",
                    modelURI,
                    sessionId,
                  },
                  {
                    onError: (error) => {
                      toast.error(
                        `There was an error starting your ${submitAgentName === "chat" ? "chat" : "project"}: ${error.message}`,
                      );
                    },
                    onSuccess: ({ subdomain }) => {
                      const location = router.buildLocation({
                        params: { subdomain },
                        search: { selectedSessionId: sessionId },
                        to: "/projects/$subdomain",
                      });

                      if (openInNewTab) {
                        void addTab({ select: false, urlPath: location.href });
                      } else {
                        void navigate({
                          params: { subdomain },
                          search: { selectedSessionId: sessionId },
                          to: "/projects/$subdomain",
                        });
                      }
                    },
                  },
                );
              }}
              showAgentPicker
            />
            <div className="flex items-center justify-end mt-2">
              <p className="text-xs text-muted-foreground">
                Hold <Kbd>{isMacOS() ? "⌘" : "Ctrl"}</Kbd> to create in a new
                tab
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl px-8 pb-8 flex-1 pt-16">
        {!isDismissed && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-foreground">
                What&apos;s New
              </h2>
              <Button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
            <Card className="bg-linear-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30 py-2">
              <CardContent className="flex gap-x-3 px-3 items-center">
                <div className="size-10 rounded-full bg-black/80 dark:bg-black/30 flex items-center justify-center shrink-0 p-1.5">
                  <QuestsAnimatedLogo size={32} />
                </div>
                <p className="text-sm text-foreground/90">
                  <strong>Easier AI access is here!</strong>{" "}
                  <InternalLink
                    className="underline hover:text-foreground"
                    openInCurrentTab
                    to="/login"
                  >
                    Create an account
                  </InternalLink>{" "}
                  to get started with free AI credits or{" "}
                  <InternalLink
                    className="underline hover:text-foreground"
                    openInCurrentTab
                    to="/release-notes"
                  >
                    read the announcement
                  </InternalLink>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-medium text-foreground">Discover</h2>
          </div>
        </div>
        <NewTabDiscoverHeroCards />

        {hasProjects && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-foreground">
                Recent Projects
              </h2>
              {(projectsData?.projects.length ?? 0) > 4 && (
                <InternalLink
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  openInCurrentTab
                  to="/projects"
                >
                  View all
                </InternalLink>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <InternalLink
                  key={project.subdomain}
                  openInCurrentTab
                  params={{ subdomain: project.subdomain }}
                  to="/projects/$subdomain"
                >
                  <Card className="hover:shadow-md transition-shadow py-0">
                    <CardContent className="flex items-center gap-x-4 py-4">
                      <SmallAppIcon
                        background={project.icon?.background}
                        icon={project.icon?.lucide}
                        mode={project.mode}
                        size="xl"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-x-2 mb-1.5">
                          <h3 className="text-base font-medium text-foreground truncate">
                            {project.title}
                          </h3>
                          <AppStatusIcon
                            className="size-4 shrink-0"
                            subdomain={project.subdomain}
                          />
                        </div>
                        <div className="flex items-center gap-x-1.5 text-xs text-muted-foreground">
                          <ModelPreview subdomain={project.subdomain} />
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(project.updatedAt, {
                              addSuffix: true,
                            })
                              .replace("less than ", "")
                              .replace("about ", "")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </InternalLink>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="w-full py-4 px-8">
        <p className="text-center text-xs text-muted-foreground">
          {PRODUCT_NAME} is{" "}
          <ExternalLink
            className="hover:text-foreground hover:underline transition-colors"
            href={APP_REPO_URL}
          >
            open source
          </ExternalLink>
          <span className="mx-2">·</span>
          <ExternalLink
            className="hover:text-foreground hover:underline transition-colors"
            href={DISCORD_URL}
          >
            Join us on Discord
          </ExternalLink>
          <span className="mx-2">·</span>
          <ExternalLink
            className="hover:text-foreground hover:underline transition-colors"
            href={NEW_ISSUE_URL}
          >
            Report an issue
          </ExternalLink>
        </p>
      </footer>
    </div>
  );
}
