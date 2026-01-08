import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { ModelBadges } from "@/client/components/model-badges";
import { NewTabHelpMessage } from "@/client/components/new-tab-help-message";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Textarea } from "@/client/components/ui/textarea";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import {
  getGroupedModelsEntries,
  groupAndFilterModels,
  type GroupedModels,
} from "@/client/lib/group-models";
import { rpcClient } from "@/client/rpc/client";
import { CUSTOM_EVAL_TEMPLATE_NAME } from "@/shared/evals";
import { createIconMeta } from "@/shared/tabs";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { EVAL_SUBDOMAIN_PREFIX } from "@quests/shared";
import { type AIProviderType } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Loader2, X } from "lucide-react";
import { sift } from "radashi";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ulid } from "ulid";

const selectedEvalProviderAtom = atomWithStorage<"all" | AIProviderType>(
  "evals-selected-provider",
  "all",
);

const selectedEvalTemplatesAtom = atomWithStorage<string[]>(
  "evals-selected-templates",
  [],
);

const selectedModelsAtom = atomWithStorage<AIGatewayModelURI.Type[]>(
  "evals-selected-models",
  [],
);

const customEvalPromptAtom = atomWithStorage<string>("evals-custom-prompt", "");

export const Route = createFileRoute("/_app/evals/")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Evals",
        },
        createIconMeta("flask-conical"),
      ],
    };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { addTab } = useTabActions();
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const [selectedEvalTemplatesArray, setSelectedEvalTemplatesArray] = useAtom(
    selectedEvalTemplatesAtom,
  );
  const [selectedModelsArray, setSelectedModelsArray] =
    useAtom(selectedModelsAtom);
  const [selectedProvider, setSelectedProvider] = useAtom(
    selectedEvalProviderAtom,
  );
  const [customEvalPrompt, setCustomEvalPrompt] = useAtom(customEvalPromptAtom);
  const [isCreating, setIsCreating] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const selectedEvalTemplates = useMemo(
    () => new Set(selectedEvalTemplatesArray),
    [selectedEvalTemplatesArray],
  );
  const selectedModels = useMemo(
    () => new Set(selectedModelsArray),
    [selectedModelsArray],
  );
  const createMutation = useMutation(
    rpcClient.workspace.project.create.mutationOptions(),
  );

  const {
    data: modelsData,
    isError: modelsIsError,
    isLoading: modelsIsLoading,
  } = useQuery(rpcClient.gateway.models.live.list.experimental_liveOptions());
  const { models } = modelsData ?? {};

  const {
    data: evalTemplateGroups,
    isError: evalTemplateGroupsIsError,
    isLoading: evalTemplateGroupsIsLoading,
  } = useQuery(rpcClient.evals.template.listGroups.queryOptions());

  const availableProviders = useMemo(() => {
    if (!models) {
      return [];
    }
    const providerSet = new Set(models.map((m) => m.params.provider));
    return [...providerSet].sort();
  }, [models]);

  const filteredModels = useMemo(() => {
    if (!models) {
      return [];
    }
    if (selectedProvider === "all") {
      return models;
    }
    return models.filter((m) => m.params.provider === selectedProvider);
  }, [models, selectedProvider]);

  const groupedModels: GroupedModels = useMemo(
    () => groupAndFilterModels(filteredModels),
    [filteredModels],
  );

  const handleToggleEvalTemplate = (templateName: string) => {
    const newSelected = new Set(selectedEvalTemplates);
    if (newSelected.has(templateName)) {
      newSelected.delete(templateName);
    } else {
      newSelected.add(templateName);
    }
    setSelectedEvalTemplatesArray([...newSelected]);
  };

  const handleToggleModel = (modelURI: AIGatewayModelURI.Type) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelURI)) {
      newSelected.delete(modelURI);
    } else {
      newSelected.add(modelURI);
    }
    setSelectedModelsArray([...newSelected]);
  };

  const createEvals = async (openInNewTab = false) => {
    setShowConfirmDialog(false);
    setIsCreating(true);

    const evalNames = [...selectedEvalTemplates];
    const modelIds = sift(
      [...selectedModels].map((modelURI) => {
        const model = models?.find((m) => m.uri === modelURI);
        return model?.canonicalId;
      }),
    );

    captureClientEvent("eval.created", {
      eval_names: evalNames,
      model_ids: modelIds,
    });

    try {
      const createdProjects = [];

      for (const templateName of selectedEvalTemplates) {
        for (const modelURI of selectedModels) {
          const model = modelsData?.models.find((m) => m.uri === modelURI);
          if (!model) {
            toast.error(`Model not found: ${modelURI}`);
            continue;
          }

          const isCustomTemplate = templateName === CUSTOM_EVAL_TEMPLATE_NAME;
          const template = isCustomTemplate
            ? null
            : evalTemplateGroups
                ?.flatMap((g) => g.templates)
                .find((t) => t.name === templateName);
          const userPrompt = isCustomTemplate
            ? customEvalPrompt.trim()
            : template?.userPrompt;

          if (!userPrompt) {
            continue;
          }

          const prompt = sift([template?.systemPrompt, userPrompt]).join(
            "\n\n",
          );
          const name = `${templateName} - ${model.name}`;

          const project = await createMutation.mutateAsync({
            iconName: "flask-conical",
            modelURI,
            name,
            preferredFolderName: `${EVAL_SUBDOMAIN_PREFIX}${ulid().toLowerCase()}`,
            prompt,
          });
          createdProjects.push(project);
        }
      }

      if (createdProjects.length === 1 && createdProjects[0]) {
        if (openInNewTab) {
          void addTab(
            {
              params: { subdomain: createdProjects[0].subdomain },
              to: "/projects/$subdomain",
            },
            { select: false },
          );
        } else {
          void navigate({
            params: { subdomain: createdProjects[0].subdomain },
            to: "/projects/$subdomain",
          });
        }
      } else if (createdProjects.length > 1) {
        if (openInNewTab) {
          if (createdProjects.length <= 4) {
            for (const project of createdProjects) {
              void addTab(
                {
                  params: { subdomain: project.subdomain },
                  to: "/projects/$subdomain",
                },
                { select: false },
              );
            }
          } else {
            void addTab(
              {
                search: { filter: "evals" },
                to: "/projects",
              },
              { select: false },
            );
          }
        } else {
          void navigate({
            search: { filter: "evals" },
            to: "/projects",
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to create projects: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunEvals = async (
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setHasAttemptedSubmit(true);

    if (selectedEvalTemplates.size === 0) {
      toast.error("Please select at least one eval template");
      return;
    }

    if (selectedModels.size === 0) {
      toast.error("Please select at least one model");
      return;
    }

    if (
      selectedEvalTemplates.has(CUSTOM_EVAL_TEMPLATE_NAME) &&
      !customEvalPrompt.trim()
    ) {
      toast.error("Please enter a custom eval prompt");
      return;
    }

    const totalProjects = selectedEvalTemplates.size * selectedModels.size;

    if (totalProjects > 10) {
      setShowConfirmDialog(true);
      return;
    }

    const openInNewTab = event
      ? event.ctrlKey || event.metaKey || event.button === 1
      : false;
    await createEvals(openInNewTab);
  };

  if (modelsIsLoading || evalTemplateGroupsIsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (modelsIsError || evalTemplateGroupsIsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">Failed to load data</p>
      </div>
    );
  }

  const totalProjectsToCreate =
    selectedEvalTemplates.size * selectedModels.size;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1">
      <div>
        <div className="mx-auto px-4 pt-10 sm:px-6 lg:px-8 lg:pt-20 lg:pb-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Evals
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Quickly see how models perform by creating apps for the prompts
              and models you select below.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Select Prompts</h2>
                <div className="flex items-center gap-2">
                  {selectedEvalTemplates.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedEvalTemplates.size} selected
                    </span>
                  )}
                  <Button
                    disabled={selectedEvalTemplates.size === 0}
                    onClick={() => {
                      setSelectedEvalTemplatesArray([]);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border">
                <Command>
                  <CommandInput placeholder="Search prompts..." />
                  <CommandList className="max-h-96">
                    <CommandEmpty>No prompts found</CommandEmpty>
                    {!evalTemplateGroups || evalTemplateGroups.length === 0 ? (
                      <CommandGroup>
                        <CommandItem disabled>No prompts available</CommandItem>
                      </CommandGroup>
                    ) : (
                      evalTemplateGroups.map((group) => (
                        <CommandGroup heading={group.name} key={group.name}>
                          {group.templates.map((template) => {
                            const isCustom =
                              template.name === CUSTOM_EVAL_TEMPLATE_NAME;
                            return (
                              <CommandItem
                                key={template.name}
                                onSelect={() => {
                                  handleToggleEvalTemplate(template.name);
                                }}
                                value={template.name}
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                  <Checkbox
                                    checked={selectedEvalTemplates.has(
                                      template.name,
                                    )}
                                    className="mt-0.5 shrink-0 [&_svg]:text-primary-foreground!"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">
                                      {template.name}
                                    </div>
                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {isCustom
                                        ? "Write your own custom eval prompt"
                                        : template.userPrompt}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      ))
                    )}
                  </CommandList>
                </Command>
              </div>
              {selectedEvalTemplates.has(CUSTOM_EVAL_TEMPLATE_NAME) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Custom Eval Prompt</h3>
                  <Textarea
                    className={`min-h-24 resize-y ${hasAttemptedSubmit && !customEvalPrompt.trim() ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    onChange={(e) => {
                      setCustomEvalPrompt(e.target.value);
                    }}
                    placeholder="Enter your custom eval prompt..."
                    value={customEvalPrompt}
                  />
                  {hasAttemptedSubmit && !customEvalPrompt.trim() && (
                    <p className="text-sm text-destructive">
                      Custom eval prompt is required
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Select Models</h2>
                <div className="flex items-center gap-2">
                  {selectedModels.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedModels.size} selected
                    </span>
                  )}
                  <Button
                    disabled={selectedModels.size === 0}
                    onClick={() => {
                      setSelectedModelsArray([]);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <Tabs
                className="w-full"
                onValueChange={(value) => {
                  setSelectedProvider(value as typeof selectedProvider);
                }}
                value={selectedProvider}
              >
                <TabsList className="h-auto min-h-9 w-full flex-wrap gap-1.5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {availableProviders.map((provider) => {
                    const metadata = providerMetadataMap.get(provider);
                    if (!metadata) {
                      return null;
                    }
                    return (
                      <TabsTrigger key={provider} value={provider}>
                        <AIProviderIcon className="size-4" type={provider} />
                        {metadata.name}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="rounded-lg border">
                <Command>
                  <CommandInput placeholder="Search models..." />
                  <CommandList className="max-h-96">
                    <CommandEmpty>No models found</CommandEmpty>
                    {!models || models.length === 0 ? (
                      <CommandGroup>
                        <CommandItem disabled>No models available</CommandItem>
                      </CommandGroup>
                    ) : (
                      getGroupedModelsEntries(groupedModels).map(
                        ([groupName, groupModels]) => {
                          if (groupModels.length === 0) {
                            return null;
                          }
                          return (
                            <CommandGroup heading={groupName} key={groupName}>
                              {groupModels.map((model) => (
                                <CommandItem
                                  key={model.uri}
                                  onSelect={() => {
                                    handleToggleModel(model.uri);
                                  }}
                                  value={model.uri}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Checkbox
                                      checked={selectedModels.has(model.uri)}
                                      className="shrink-0 [&_svg]:text-primary-foreground!"
                                    />
                                    <AIProviderIcon
                                      className="size-4 shrink-0 opacity-90"
                                      type={model.params.provider}
                                    />
                                    <span className="truncate text-sm">
                                      {model.name}
                                    </span>
                                  </div>
                                  <div className="ml-2 flex items-center gap-1">
                                    <ModelBadges model={model} />
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        },
                      )
                    )}
                  </CommandList>
                </Command>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="sticky top-6">
              <div className="space-y-4 rounded-lg border bg-card p-4">
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={
                      selectedEvalTemplates.size === 0 ||
                      selectedModels.size === 0 ||
                      isCreating
                    }
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        void handleRunEvals(e);
                      }
                    }}
                    onClick={handleRunEvals}
                    onMouseDown={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                      }
                    }}
                    size="lg"
                  >
                    {isCreating
                      ? "Creating..."
                      : totalProjectsToCreate === 0
                        ? "Run evals"
                        : `Run ${totalProjectsToCreate} eval${totalProjectsToCreate === 1 ? "" : "s"}`}
                  </Button>
                  <div className="flex items-center justify-center">
                    <NewTabHelpMessage />
                  </div>
                </div>

                {totalProjectsToCreate === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Select prompts and models to begin
                  </div>
                ) : (
                  <div className="space-y-3 border-t pt-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {selectedEvalTemplates.size}{" "}
                        {selectedEvalTemplates.size === 1
                          ? "Prompt"
                          : "Prompts"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...selectedEvalTemplates].map((templateName) => (
                          <div
                            className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pr-1 pl-2"
                            key={templateName}
                          >
                            <div className="truncate text-xs">
                              {templateName}
                            </div>
                            <button
                              className="shrink-0 rounded hover:bg-background"
                              onClick={() => {
                                handleToggleEvalTemplate(templateName);
                              }}
                              type="button"
                            >
                              <X className="size-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {selectedModels.size}{" "}
                        {selectedModels.size === 1 ? "Model" : "Models"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {models
                          ?.filter((m) => selectedModels.has(m.uri))
                          .map((model) => (
                            <div
                              className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pr-1 pl-2"
                              key={model.uri}
                            >
                              <AIProviderIcon
                                className="size-3 shrink-0 opacity-90"
                                type={model.params.provider}
                              />
                              <span className="truncate text-xs">
                                {model.name}
                              </span>
                              <button
                                className="shrink-0 rounded hover:bg-background"
                                onClick={() => {
                                  handleToggleModel(model.uri);
                                }}
                                type="button"
                              >
                                <X className="size-3 text-muted-foreground" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                <AlertDialog
                  onOpenChange={setShowConfirmDialog}
                  open={showConfirmDialog}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Create {totalProjectsToCreate} evals?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to create {totalProjectsToCreate} eval
                        projects. This may take some time and will use
                        significant tokens.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void createEvals(false);
                        }}
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {totalProjectsToCreate > 0 && (
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Each prompt-model combination creates a separate app
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
