import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { NewTabDiscoverHeroCards } from "@/client/components/discover-hero-card";
import { ExternalLink } from "@/client/components/external-link";
import { InternalLink } from "@/client/components/internal-link";
import { ModelPreview } from "@/client/components/projects-data-table/model-preview";
import { PromptInput } from "@/client/components/prompt-input";
import { Card, CardContent } from "@/client/components/ui/card";
import { Kbd } from "@/client/components/ui/kbd";
import { useReload } from "@/client/hooks/use-reload";
import { useTabs } from "@/client/hooks/use-tabs";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
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
import { ArrowRight, FlaskConical } from "lucide-react";
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

function RouteComponent() {
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const navigate = useNavigate({ from: "/new-tab" });
  const router = useRouter();
  const { addTab } = useTabs();
  const createProjectMutation = useMutation(
    rpcClient.workspace.project.create.mutationOptions(),
  );
  const createChatMutation = useMutation(
    rpcClient.workspace.project.createChat.mutationOptions(),
  );

  const { data: projectsData } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions({
      input: { direction: "desc", sortBy: "updatedAt" },
    }),
  );

  const recentProjects = projectsData?.projects.slice(0, 4) ?? [];
  const hasProjects = (projectsData?.projects.length ?? 0) > 0;

  useReload();

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col items-center relative">
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-36">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-semibold text-foreground leading-tight">
              Start your next quest
            </h1>
          </div>
          <div>
            <PromptInput
              allowOpenInNewTab
              atomKey="$$new-tab$$"
              autoFocus
              autoResizeMaxHeight={300}
              isLoading={
                createProjectMutation.isPending || createChatMutation.isPending
              }
              modelURI={selectedModelURI}
              onModelChange={setSelectedModelURI}
              onSubmit={({
                agentName: submitAgentName,
                modelURI,
                openInNewTab,
                prompt,
              }) => {
                const promptText = prompt.trim();
                const messageId = StoreId.newMessageId();
                const sessionId = StoreId.newSessionId();
                const createdAt = new Date();

                const message = {
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
                      text: promptText,
                      type: "text" as const,
                    },
                  ],
                  role: "user" as const,
                };

                const mutation =
                  submitAgentName === "chat"
                    ? createChatMutation
                    : createProjectMutation;

                mutation.mutate(
                  {
                    message,
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
            <p className="text-xs text-muted-foreground/50 mt-2 text-right">
              Hold <Kbd>{isMacOS() ? "⌘" : "Ctrl"}</Kbd> to create in a new tab
            </p>
          </div>

          <button
            className="mt-8 w-full border border-brand/30 rounded-lg p-4 bg-gradient-to-br from-brand/5 via-brand/8 to-brand/10 hover:from-brand/8 hover:via-brand/12 hover:to-brand/15 hover:border-brand/40 transition-all group shadow-sm"
            onClick={() => {
              void navigate({ to: "/evals" });
            }}
            type="button"
          >
            <div className="flex items-start gap-3">
              <FlaskConical className="size-5 text-brand shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold mb-0.5">
                  Experiment with Evals
                </h3>
                <p className="text-xs text-muted-foreground">
                  Try built-in prompts across multiple models
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-brand-foreground text-sm font-medium group-hover:bg-brand/90 transition-colors">
                Run an eval
                <ArrowRight className="size-4" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl px-8 pb-8 flex-1 pt-16">
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
            <div className="grid gap-4 md:grid-cols-2">
              {recentProjects.map((project) => (
                <InternalLink
                  key={project.subdomain}
                  openInCurrentTab
                  params={{ subdomain: project.subdomain }}
                  to="/projects/$subdomain"
                >
                  <Card className="hover:shadow-md transition-shadow py-0">
                    <CardContent className="flex items-center gap-x-4 py-4">
                      {project.icon && (
                        <SmallAppIcon
                          background={project.icon.background}
                          icon={project.icon.lucide}
                          size="xl"
                        />
                      )}
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
