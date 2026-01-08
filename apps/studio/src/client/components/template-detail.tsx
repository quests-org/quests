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
import { useDefaultModelURI } from "@/client/hooks/use-default-model-uri";
import { rpcClient } from "@/client/rpc/client";
import {
  GITHUB_ORG,
  REGISTRY_REPO_NAME,
  REGISTRY_REPO_URL,
} from "@quests/shared";
import { type Upload } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
  const [selectedModelURI, setSelectedModelURI, saveSelectedModelURI] =
    useDefaultModelURI();
  const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const handleCreateProject = (prompt: string, files?: Upload.Type[]) => {
    if (appDetails && selectedModelURI) {
      saveSelectedModelURI(selectedModelURI);

      createProjectMutation.mutate(
        {
          files,
          modelURI: selectedModelURI,
          prompt,
          templateName: folderName,
        },
        {
          onError: (error) => {
            toast.error(
              `There was an error starting your project: ${error.message}`,
            );
          },
          onSuccess: ({ sessionId, subdomain }) => {
            void navigate({
              params: { subdomain },
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
    <div className="mx-auto max-w-4xl px-8">
      <div className="sticky top-0 z-10 mb-4 bg-background/95 pt-8 pb-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>

      <div className="mb-6">
        <PromptInput
          atomKey="$$template$$"
          autoFocus={false}
          autoResizeMaxHeight={200}
          disabled={createProjectMutation.isPending}
          isLoading={createProjectMutation.isPending}
          isSubmittable={!createProjectMutation.isPending}
          modelURI={selectedModelURI}
          onModelChange={setSelectedModelURI}
          onSubmit={({ files, prompt }) => {
            handleCreateProject(prompt.trim(), files);
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
        <div className="group relative mb-6">
          <img
            alt={`${title} screenshot`}
            className="w-full rounded-lg border border-border"
            src={screenshot}
          />
          <div className="absolute bottom-4 left-4">
            <Button
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_200px]">
        <div>
          {appDetails.readme && (
            <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
              <Markdown markdown={appDetails.readme} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium">Source Code</h3>
            <a
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

      <DialogPrimitive.Root
        onOpenChange={setShowPreviewDialog}
        open={showPreviewDialog}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex h-full max-h-[75vh] w-full max-w-[80vw] -translate-x-1/2 -translate-y-1/2 flex-col p-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <DialogPrimitive.Title className="sr-only">
              Preview
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              App preview
            </DialogPrimitive.Description>
            <Button
              className="absolute top-[-5%] right-[-4%] z-10 size-10 rounded-full"
              onClick={() => {
                setShowPreviewDialog(false);
              }}
              size="sm"
              variant="secondary"
            >
              <X className="size-5" />
            </Button>
            <div className="relative min-h-0 flex-1">
              <AppView
                app={appDetails.preview}
                className="flex h-full w-full flex-col overflow-hidden"
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
