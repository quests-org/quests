import { selectedModelURIAtom } from "@/client/atoms/selected-models";
import { DiscoverAppsGrid } from "@/client/components/discover-apps-grid";
import { PromptInput } from "@/client/components/prompt-input";
import { Button } from "@/client/components/ui/button";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowRight } from "lucide-react";
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
  loader: async () => {
    const registryApps = await vanillaRpcClient.workspace.registryApp.list();
    return {
      registryApps,
    };
  },
});

function RouteComponent() {
  const { registryApps } = Route.useLoaderData();
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const navigate = useNavigate({ from: "/new-tab" });
  const createProjectMutation = useMutation(
    rpcClient.workspace.project.create.mutationOptions(),
  );
  const appVersionQuery = useQuery(
    rpcClient.preferences.getAppVersion.queryOptions(),
  );

  return (
    <div className="w-full min-h-screen flex-1 flex flex-col items-center relative">
      <div className="absolute top-6 right-6">
        <Button asChild className="gap-x-2" size="sm" variant="ghost">
          <Link className="flex items-center gap-x-2" to="/release-notes">
            <span className="flex items-center gap-x-1">
              {appVersionQuery.data?.version ? (
                <>
                  <span className="font-medium">
                    v{appVersionQuery.data.version}
                  </span>
                  <span className="text-muted-foreground">•</span>
                </>
              ) : null}
              <span>Release Notes</span>
            </span>
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-2xl space-y-8 px-8 pt-52">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-semibold text-foreground leading-tight">
              Start your next quest
            </h1>
          </div>
          <PromptInput
            autoFocus
            autoResizeMaxHeight={300}
            isLoading={createProjectMutation.isPending}
            modelURI={selectedModelURI}
            onModelChange={setSelectedModelURI}
            onSubmit={({ modelURI, prompt }) => {
              const promptText = prompt.trim();
              const messageId = StoreId.newMessageId();
              const sessionId = StoreId.newSessionId();
              const createdAt = new Date();

              createProjectMutation.mutate(
                {
                  message: {
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
                        type: "text",
                      },
                    ],
                    role: "user",
                  },
                  modelURI,
                  sessionId,
                },
                {
                  onError: (error) => {
                    toast.error(
                      `There was an error starting your project: ${error.message}`,
                    );
                  },
                  onSuccess: ({ subdomain }) => {
                    void navigate({
                      params: { subdomain },
                      search: { selectedSessionId: sessionId },
                      to: "/projects/$subdomain",
                    });
                  },
                },
              );
            }}
            placeholder="Describe the app you want to create…"
          />
        </div>
      </div>

      <div className="w-full max-w-6xl px-8 pb-8 flex-1 pt-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Discover</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start from built-in apps and templates
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/discover">
              Browse All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <DiscoverAppsGrid registryApps={registryApps} />
      </div>
    </div>
  );
}
