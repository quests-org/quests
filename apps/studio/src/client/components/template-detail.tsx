import { hasAIProviderConfigAtom } from "@/client/atoms/has-ai-provider-config";
import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { AIProviderGuard } from "@/client/components/ai-provider-guard";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { AppView } from "@/client/components/app-view";
import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/client/components/breadcrumb";
import { Markdown } from "@/client/components/markdown";
import { NotFoundComponent } from "@/client/components/not-found";
import { PromptInput } from "@/client/components/prompt-input";
import { GithubLogo } from "@/client/components/service-icons";
import { TechStack } from "@/client/components/tech-stack";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogContent } from "@/client/components/ui/dialog";
import { rpcClient } from "@/client/rpc/client";
import {
  GITHUB_ORG,
  REGISTRY_REPO_NAME,
  REGISTRY_REPO_URL,
} from "@quests/shared";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { ArrowUp, Eye, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TemplateDetailProps {
  breadcrumbItems: BreadcrumbItem[];
  folderName: string;
}

export function TemplateDetail({
  breadcrumbItems,
  folderName,
}: TemplateDetailProps) {
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
    <div className="max-w-4xl mx-auto px-8">
      <div className="sticky top-0 z-10 pt-8 pb-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Breadcrumb items={breadcrumbItems} />
      </div>

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
              Preview
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
            <h3 className="text-sm font-medium mb-2">Source Code</h3>
            <a
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              href={`${REGISTRY_REPO_URL}/tree/main/templates/${folderName}`}
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
          className="max-w-[80vw] sm:max-w-[80vw] w-full max-h-[75vh] p-0 h-full flex flex-col"
          portalContent={
            <Button
              className="fixed right-[4%] top-[5%] z-[60] rounded-full size-10"
              onClick={() => {
                setShowPreviewDialog(false);
              }}
              size="sm"
              variant="secondary"
            >
              <X className="size-5" />
            </Button>
          }
          showCloseButton={false}
        >
          <div className="flex-1 min-h-0 relative">
            {hasAIProvider ? (
              <AppView
                app={appDetails.preview}
                className="w-full h-full overflow-hidden flex flex-col"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background">
                <AIProviderGuard description="You need to add an AI provider to view previews." />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
