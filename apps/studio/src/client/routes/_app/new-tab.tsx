import { AppFooter } from "@/client/components/app-footer";
import { AppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { CommandMenuCTA } from "@/client/components/command-menu-cta";
import { NewTabDiscoverHeroCards } from "@/client/components/discover-hero-card";
import { InternalLink } from "@/client/components/internal-link";
import { NewTabHelpMessage } from "@/client/components/new-tab-help-message";
import { ModelPreview } from "@/client/components/projects-data-table/model-preview";
import { PromptInput } from "@/client/components/prompt-input";
import { Card, CardContent } from "@/client/components/ui/card";
import { useDefaultModelURI } from "@/client/hooks/use-default-model-uri";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
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
  loader: async ({ context }) => {
    const hasToken = await rpcClient.auth.hasToken.call();
    // Ensures the UI doesn't flicker by pre-loading the hasToken data
    // Using a raw RPC call because it's a live query, which means
    // `.ensureQueryData` would never resolve.
    context.queryClient.setQueryData(
      rpcClient.auth.live.hasToken.experimental_liveKey(),
      hasToken,
    );
  },
});

function RouteComponent() {
  const [selectedModelURI, setSelectedModelURI, saveSelectedModelURI] =
    useDefaultModelURI();
  const { data: hasToken } = useQuery(
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
    <div className="relative flex min-h-screen w-full flex-1 flex-col items-center">
      <div className="flex w-full items-center justify-center">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-36">
          {hasToken === false && (
            <div className="mb-8 flex flex-col items-center gap-y-4">
              <button
                className="group relative flex items-center gap-x-4 overflow-hidden rounded-2xl border border-brand/50 bg-linear-to-r from-brand/20 via-brand/10 to-brand/20 px-6 py-4 shadow-lg shadow-brand/10 transition-all duration-300 hover:scale-[1.02] hover:border-brand hover:from-brand/30 hover:via-brand/20 hover:to-brand/30 hover:shadow-xl hover:shadow-brand/20"
                onClick={() => void navigate({ to: "/sign-in" })}
                type="button"
              >
                <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-brand/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand/20 transition-colors group-hover:bg-brand/30">
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
              allowOpenInNewTab
              atomKey="$$new-tab$$"
              autoFocus
              autoResizeMaxHeight={300}
              isLoading={createProjectMutation.isPending}
              modelURI={selectedModelURI}
              onModelChange={setSelectedModelURI}
              onSubmit={({ files, modelURI, openInNewTab, prompt }) => {
                saveSelectedModelURI(modelURI);

                createProjectMutation.mutate(
                  { files, modelURI, prompt },
                  {
                    onError: (error) => {
                      toast.error(
                        `There was an error starting your project: ${error.message}`,
                      );
                    },
                    onSuccess: ({ sessionId, subdomain }) => {
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
              placeholder="Type, paste, or drop some files here…"
            />
            <div className="mt-2 flex items-center justify-end">
              <NewTabHelpMessage />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex-1 px-8 pt-16 pb-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground">Discover</h2>
          </div>
        </div>
        <NewTabDiscoverHeroCards />

        {hasProjects && (
          <div className="mt-16">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-x-4">
                <h2 className="text-lg font-medium text-foreground">
                  Recent Projects
                </h2>
                {(projectsData?.projects.length ?? 0) > 4 && (
                  <InternalLink
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    openInCurrentTab
                    to="/projects"
                  >
                    View all
                  </InternalLink>
                )}
              </div>
              <CommandMenuCTA />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <InternalLink
                  key={project.subdomain}
                  openInCurrentTab
                  params={{ subdomain: project.subdomain }}
                  to="/projects/$subdomain"
                >
                  <Card className="py-0 transition-shadow hover:shadow-md">
                    <CardContent className="py-4">
                      <div className="mb-1.5 flex items-center gap-x-1">
                        {project.iconName && (
                          <AppIcon name={project.iconName} size="sm" />
                        )}
                        <h3 className="truncate text-base font-medium text-foreground">
                          {project.title}
                        </h3>
                        <AppStatusIcon
                          className="size-4 shrink-0"
                          subdomain={project.subdomain}
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-x-1.5 text-xs text-muted-foreground">
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
                    </CardContent>
                  </Card>
                </InternalLink>
              ))}
            </div>
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
