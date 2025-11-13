import { agentNameAtomFamily } from "@/client/atoms/agent-name";
import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { NewTabDiscoverHeroCards } from "@/client/components/discover-hero-card";
import { ExternalLink } from "@/client/components/external-link";
import { InternalLink } from "@/client/components/internal-link";
import { ModelPreview } from "@/client/components/projects-data-table/model-preview";
import { PromptInput } from "@/client/components/prompt-input";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent } from "@/client/components/ui/card";
import { Kbd } from "@/client/components/ui/kbd";
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
  const [agentName, setAgentName] = useAtom(agentNameAtomFamily("$$new-tab$$"));
  const navigate = useNavigate({ from: "/new-tab" });
  const router = useRouter();
  const { addTab } = useTabs();
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

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col items-center relative">
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-36">
          <div>
            <PromptInput
              allowOpenInNewTab
              atomKey="$$new-tab$$"
              autoFocus
              autoResizeMaxHeight={300}
              isLoading={createProjectMutation.isPending}
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

                createProjectMutation.mutate(
                  {
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
            <div className="flex items-center justify-between mt-2">
              {agentName !== "chat" && (
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setAgentName("chat");
                  }}
                  type="button"
                >
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-4"
                    variant="brand-outline"
                  >
                    NEW
                  </Badge>
                  <span>Chat with models</span>
                </button>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
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
