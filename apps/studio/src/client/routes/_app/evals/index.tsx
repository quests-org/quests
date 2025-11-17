import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { IconMap } from "@/client/components/app-icons";
import { ModelTags } from "@/client/components/model-tags";
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
import { captureClientEvent } from "@/client/lib/capture-client-event";
import {
  getGroupedModelsEntries,
  groupAndFilterModels,
  type GroupedModels,
} from "@/client/lib/group-models";
import { rpcClient } from "@/client/rpc/client";
import { CUSTOM_EVAL_TEMPLATE_NAME } from "@/shared/evals";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type AIProviderType } from "@quests/shared";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Loader2 } from "lucide-react";
import { sift } from "radashi";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
        {
          content: "chart-line",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
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
  const createFromEvalMutation = useMutation(
    rpcClient.workspace.project.createFromEval.mutationOptions(),
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

  const createEvals = async () => {
    setShowConfirmDialog(false);
    setIsCreating(true);

    const totalProjects = selectedEvalTemplates.size * selectedModels.size;

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
        if (templateName === CUSTOM_EVAL_TEMPLATE_NAME) {
          for (const modelURI of selectedModels) {
            const sessionId = StoreId.newSessionId();

            const project = await createFromEvalMutation.mutateAsync({
              evalName: CUSTOM_EVAL_TEMPLATE_NAME,
              iconName: "pencil",
              modelURI,
              sessionId,
              systemPrompt: "",
              userPrompt: customEvalPrompt.trim(),
            });
            createdProjects.push(project);
          }
        } else {
          const template = evalTemplateGroups
            ?.flatMap((g) => g.templates)
            .find((t) => t.name === templateName);
          if (!template) {
            continue;
          }

          for (const modelURI of selectedModels) {
            const sessionId = StoreId.newSessionId();

            const project = await createFromEvalMutation.mutateAsync({
              evalName: template.name,
              iconName: template.iconName,
              modelURI,
              sessionId,
              systemPrompt: template.systemPrompt,
              userPrompt: template.userPrompt,
            });
            createdProjects.push(project);
          }
        }
      }

      toast.success(`Successfully created all ${totalProjects} projects`);

      if (createdProjects.length === 1 && createdProjects[0]) {
        void navigate({
          params: { subdomain: createdProjects[0].subdomain },
          to: "/projects/$subdomain",
        });
      } else if (createdProjects.length > 1) {
        void navigate({
          search: { filter: "evals" },
          to: "/projects",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to create projects: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunEvals = async () => {
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

    await createEvals();
  };

  if (modelsIsLoading || evalTemplateGroupsIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (modelsIsError || evalTemplateGroupsIsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-destructive">Failed to load data</p>
      </div>
    );
  }

  const totalProjectsToCreate =
    selectedEvalTemplates.size * selectedModels.size;

  return (
    <div className="flex-1 mx-auto max-w-7xl w-full">
      <div>
        <div className="mx-auto px-4 pt-10 lg:pt-20 lg:pb-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Evals
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground max-w-lg mx-auto">
              Quickly see how models perform by creating apps for the prompts
              and models you select below.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_350px] gap-6">
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
              <div className="border rounded-lg">
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
                            const IconComponent = IconMap[template.iconName];
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
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <Checkbox
                                    checked={selectedEvalTemplates.has(
                                      template.name,
                                    )}
                                    className="shrink-0 mt-0.5 [&_svg]:text-primary-foreground!"
                                  />
                                  <IconComponent className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">
                                      {template.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
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
                onValueChange={(value) => {
                  setSelectedProvider(value as typeof selectedProvider);
                }}
                value={selectedProvider}
              >
                <TabsList>
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

              <div className="border rounded-lg">
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
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Checkbox
                                      checked={selectedModels.has(model.uri)}
                                      className="shrink-0 [&_svg]:text-primary-foreground!"
                                    />
                                    <AIProviderIcon
                                      className="size-4 opacity-90 shrink-0"
                                      type={model.params.provider}
                                    />
                                    <span className="truncate text-sm">
                                      {model.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    <ModelTags model={model} />
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
              <div className="border rounded-lg p-4 space-y-4 bg-card">
                <Button
                  className="w-full"
                  disabled={
                    selectedEvalTemplates.size === 0 ||
                    selectedModels.size === 0 ||
                    isCreating
                  }
                  onClick={handleRunEvals}
                  size="lg"
                >
                  {isCreating
                    ? "Creating..."
                    : totalProjectsToCreate === 0
                      ? "Run evals"
                      : `Run ${totalProjectsToCreate} eval${totalProjectsToCreate === 1 ? "" : "s"}`}
                </Button>

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
                      <AlertDialogAction onClick={createEvals}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {totalProjectsToCreate === 0 ? (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Select prompts and models to begin
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {[...selectedEvalTemplates].map((templateName) => {
                      const template = evalTemplateGroups
                        ?.flatMap((g) => g.templates)
                        .find((t) => t.name === templateName);
                      const IconComponent = template
                        ? IconMap[template.iconName]
                        : null;
                      const selectedModelsList = models?.filter((m) =>
                        selectedModels.has(m.uri),
                      );

                      return (
                        <div className="space-y-1.5" key={templateName}>
                          <div className="flex items-center gap-1.5">
                            {IconComponent && (
                              <IconComponent className="size-3.5 text-muted-foreground shrink-0" />
                            )}
                            <div className="text-sm font-medium">
                              {templateName}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {selectedModelsList?.map((model) => (
                              <div
                                className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs"
                                key={model.uri}
                              >
                                <AIProviderIcon
                                  className="size-3"
                                  type={model.params.provider}
                                />
                                <span className="truncate max-w-32">
                                  {model.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {totalProjectsToCreate > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-1">
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
