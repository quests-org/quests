import { agentNameAtom } from "@/client/atoms/agent-name";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { NewTabDiscoverHeroCards } from "@/client/components/discover-hero-card";
import { ExternalLink } from "@/client/components/external-link";
import { InternalLink } from "@/client/components/internal-link";
import { ModelPreview } from "@/client/components/projects-data-table/model-preview";
import { PromptInput } from "@/client/components/prompt-input";
import { Card, CardContent } from "@/client/components/ui/card";
import { Kbd } from "@/client/components/ui/kbd";
import { useDefaultModelURI } from "@/client/hooks/use-default-model-uri";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { createUserMessage } from "@/client/lib/create-user-message";
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
import { Gift } from "lucide-react";
import { useEffect } from "react";
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
  const [selectedModelURI, setSelectedModelURI, saveSelectedModelURI] =
    useDefaultModelURI();
  const [agentName, setAgentName] = useAtom(agentNameAtom);
  const { data: hasToken, isLoading: isLoadingHasToken } = useQuery(
    rpcClient.auth.live.hasToken.experimental_liveOptions(),
  );
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

  useEffect(() => {
    // Preload the project route chunk for faster navigation
    async function preloadRouteChunks() {
      const projectRoute = router.routesByPath["/projects/$subdomain"];
      await router.loadRouteChunk(projectRoute);
    }

    void preloadRouteChunks();
  }, [router]);

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col items-center relative">
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-36">
          {!hasToken && !isLoadingHasToken && (
            <div className="flex flex-col items-center gap-y-4 mb-8">
              <button
                className="group relative overflow-hidden flex items-center gap-x-4 bg-linear-to-r from-brand/20 via-brand/10 to-brand/20 hover:from-brand/30 hover:via-brand/20 hover:to-brand/30 border border-brand/50 hover:border-brand rounded-2xl px-6 py-4 transition-all duration-300 shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/20 hover:scale-[1.02]"
                onClick={() => void navigate({ to: "/sign-in" })}
                type="button"
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-brand/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="flex items-center justify-center size-10 rounded-xl bg-brand/20 group-hover:bg-brand/30 transition-colors">
                  <Gift className="size-5 text-brand" />
                </div>
                <div className="flex flex-col items-start gap-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Unlock access to hundreds of AI models for free
                  </p>
                  <span className="text-sm font-semibold text-brand group-hover:underline">
                    Claim your credits →
                  </span>
                </div>
              </button>
            </div>
          )}
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

                saveSelectedModelURI(modelURI);

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
                      if (openInNewTab) {
                        void addTab(
                          {
                            params: { subdomain },
                            search: { selectedSessionId: sessionId },
                            to: "/projects/$subdomain",
                          },
                          { select: false },
                        );
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
                        <div className="flex items-center gap-x-1.5 text-xs text-muted-foreground min-w-0">
                          <ModelPreview subdomain={project.subdomain} />
                          <span className="shrink-0">·</span>
                          <span className="shrink-0">
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
