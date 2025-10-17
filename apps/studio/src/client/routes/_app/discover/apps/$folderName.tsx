/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import { hasAIProviderConfigAtom } from "@/client/atoms/has-ai-provider-config";
import { selectedModelURIAtom } from "@/client/atoms/selected-models";
import { AIProviderGuard } from "@/client/components/ai-provider-guard";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { SmallAppIcon } from "@/client/components/app-icon";
import { AppView } from "@/client/components/app-view";
import { InternalLink } from "@/client/components/internal-link";
import { Markdown } from "@/client/components/markdown";
import { NotFoundComponent } from "@/client/components/not-found";
import { PromptInput } from "@/client/components/prompt-input";
import { GithubLogo } from "@/client/components/service-icons";
import { TechStack } from "@/client/components/tech-stack";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
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
import { useAtom, useAtomValue } from "jotai";
import { ArrowUp, ChevronRight, Eye, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/discover/apps/$folderName")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        rpcClient.workspace.registry.template.byFolderName.queryOptions({
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
          title: `${loaderData?.title ?? params.folderName} · Discover`,
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
    rpcClient.workspace.registry.template.byFolderName.queryOptions({
      input: { folderName },
    }),
  );
  const { data: screenshot } = useQuery(
    rpcClient.workspace.registry.template.screenshot.queryOptions({
      input: { folderName },
    }),
  );
  const { data: packageJson } = useQuery(
    rpcClient.workspace.registry.template.packageJson.queryOptions({
      input: { folderName },
    }),
  );
  const navigate = useNavigate();
  const createProjectMutation = useMutation(
    rpcClient.workspace.project.create.mutationOptions(),
  );
  const hasAIProvider = useAtomValue(hasAIProviderConfigAtom);
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const handleCreateProject = (prompt?: string) => {
    if (!hasAIProvider) {
      setShowAIProviderGuard(true);
      return;
    }

    if (appDetails && selectedModelURI) {
      const sessionId = StoreId.newSessionId();
      const messageId = StoreId.newMessageId();
      const createdAt = new Date();
      const promptText = prompt?.trim() || "";

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
          modelURI: selectedModelURI,
          sessionId,
          templateName: folderName,
        },
        {
          onError: (error) => {
            toast.error(
              `There was an error starting your project: ${error.message}`,
            );
          },
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
      <div className="max-w-3xl mx-auto p-6">
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
          <InternalLink
            className="hover:text-foreground transition-colors"
            to="/discover"
          >
            Discover
          </InternalLink>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>

        <div className="mb-6">
          <PromptInput
            atomKey={appDetails.preview.subdomain}
            autoFocus={false}
            autoResizeMaxHeight={200}
            disabled={createProjectMutation.isPending}
            isLoading={createProjectMutation.isPending}
            isSubmittable={!createProjectMutation.isPending}
            modelURI={selectedModelURI}
            onModelChange={setSelectedModelURI}
            onSubmit={({ prompt }) => {
              handleCreateProject(prompt.trim());
            }}
            placeholder={`Describe what you want to build with ${title}…`}
            submitButtonContent={
              <>
                Create project
                <ArrowUp className="size-4" />
              </>
            }
          />
        </div>

        {screenshot && (
          <div className="relative group mb-6">
            <img
              alt={`${title} screenshot`}
              className="w-full rounded-lg border border-border"
              src={screenshot}
            />
            <div className="absolute bottom-4 left-4">
              <Button
                disabled={!hasAIProvider}
                onClick={() => {
                  setShowPreviewDialog(true);
                }}
                size="sm"
                variant="secondary"
              >
                <Eye className="h-4 w-4" />
                View Demo
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-8">
          <div>
            {appDetails.readme && (
              <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                <Markdown markdown={appDetails.readme} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Repository</h3>
              <a
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                href={REGISTRY_REPO_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubLogo className="size-5" />
                {GITHUB_ORG}/{REGISTRY_REPO_NAME}
              </a>
            </div>

            {packageJson && (
              <TechStack
                dependencies={packageJson.dependencies ?? {}}
                devDependencies={packageJson.devDependencies ?? {}}
              />
            )}
          </div>
        </div>

        <AIProviderGuardDialog
          description="You need to add an AI provider to create projects."
          onOpenChange={setShowAIProviderGuard}
          open={showAIProviderGuard}
        />

        <Dialog onOpenChange={setShowPreviewDialog} open={showPreviewDialog}>
          <DialogContent
            className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] w-full max-h-[calc(100vh-2rem)] h-full flex flex-col"
            showCloseButton={false}
          >
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {appDetails.icon && (
                      <SmallAppIcon
                        background={appDetails.icon.background}
                        icon={appDetails.icon.lucide}
                        size="sm"
                      />
                    )}
                    <DialogTitle>{title}</DialogTitle>
                  </div>
                  <Badge variant="secondary">Demo</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={createProjectMutation.isPending}
                    onClick={() => {
                      handleCreateProject();
                    }}
                    size="sm"
                    variant="brand"
                  >
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreviewDialog(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              {hasAIProvider ? (
                <AppView
                  app={appDetails.preview}
                  className="w-full h-full rounded-lg border border-border overflow-hidden flex flex-col"
                />
              ) : (
                <div className="w-full h-full rounded-lg border border-border flex items-center justify-center bg-background">
                  <AIProviderGuard description="You need to add an AI provider to view previews." />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
