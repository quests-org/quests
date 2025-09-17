/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import { hasAIProviderAtom } from "@/client/atoms/has-ai-provider";
import { AIProviderGuard } from "@/client/components/ai-provider-guard";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppView } from "@/client/components/app-view";
import { InternalLink } from "@/client/components/internal-link";
import { Markdown } from "@/client/components/markdown";
import { NotFoundComponent } from "@/client/components/not-found";
import { GithubLogo } from "@/client/components/service-icons";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_ICON_BACKGROUND, META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import {
  GITHUB_ORG,
  REGISTRY_REPO_NAME,
  REGISTRY_REPO_URL,
} from "@quests/shared";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/discover/apps/$folderName")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        rpcClient.workspace.registryApp.byFolderName.queryOptions({
          input: { folderName: params.folderName },
        }),
      );
    } catch {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw notFound();
    }
  },
  // eslint-disable-next-line perfectionist/sort-objects
  head: ({ loaderData, params }) => {
    return {
      meta: [
        {
          title: `${loaderData?.title ?? params.folderName} - Discover`,
        },
        {
          content: loaderData?.icon?.lucide,
          name: META_TAG_LUCIDE_ICON,
        },
        {
          content: loaderData?.icon?.background,
          name: META_TAG_ICON_BACKGROUND,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { folderName } = Route.useParams();
  const { data: appDetails } = useQuery(
    rpcClient.workspace.registryApp.byFolderName.queryOptions({
      input: { folderName },
    }),
  );
  const navigate = useNavigate();
  const createProjectFromPreviewMutation = useMutation(
    rpcClient.workspace.project.createFromPreview.mutationOptions(),
  );
  const hasAIProvider = useAtomValue(hasAIProviderAtom);
  const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);

  const handleCreateProject = () => {
    if (!hasAIProvider) {
      setShowAIProviderGuard(true);
      return;
    }

    if (appDetails) {
      const sessionId = StoreId.newSessionId();
      createProjectFromPreviewMutation.mutate(
        { previewSubdomain: appDetails.preview.subdomain, sessionId },
        {
          onSuccess: (result) => {
            void navigate({
              params: { subdomain: result.subdomain },
              search: { selectedSessionId: sessionId },
              to: "/projects/$subdomain",
            });
          },
        },
      );
    }
  };

  if (!appDetails) {
    return <NotFoundComponent message="The app could not be found." />;
  }

  const title = appDetails.title;
  const description = appDetails.description;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          <InternalLink
            className="hover:text-foreground transition-colors"
            to="/discover"
          >
            Discover
          </InternalLink>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              {appDetails.icon && (
                <SmallAppIcon
                  background={appDetails.icon.background}
                  icon={appDetails.icon.lucide}
                  size="lg"
                />
              )}
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {description && (
                <>
                  <span>{description}</span>
                  <span>•</span>
                </>
              )}
              <a
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                href={REGISTRY_REPO_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubLogo className="size-5" />
                {GITHUB_ORG}/{REGISTRY_REPO_NAME}
              </a>
            </div>
          </div>

          <Button
            className="shrink-0"
            disabled={createProjectFromPreviewMutation.isPending}
            onClick={handleCreateProject}
            size="lg"
            variant="brand"
          >
            <Plus className="h-4 w-4" />
            Start Project
          </Button>
        </div>

        <div className="w-full h-[600px]">
          {hasAIProvider ? (
            <AppView
              app={appDetails.preview}
              className="w-full h-full rounded-lg border border-border overflow-hidden flex flex-col"
            />
          ) : (
            <div className="w-full h-full rounded-lg border border-border flex items-center justify-center bg-background">
              <AIProviderGuard description="You need to add an AI provider to view app previews." />
            </div>
          )}
        </div>

        {appDetails.readme && (
          <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
            <Markdown markdown={appDetails.readme} />
          </div>
        )}

        <AIProviderGuardDialog
          description="You need to add an AI provider to create projects."
          onOpenChange={setShowAIProviderGuard}
          open={showAIProviderGuard}
        />
      </div>
    </div>
  );
}
