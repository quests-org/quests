import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { IconMap } from "@/client/components/app-icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/client/components/ui/accordion";
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
import {
  getGroupedModelsEntries,
  groupAndFilterModels,
  type GroupedModels,
} from "@/client/lib/group-models";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import {
  type AIGatewayModel,
  type AIGatewayProvider,
} from "@quests/ai-gateway";
import { StoreId } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const selectedEvalProviderAtom = atomWithStorage<
  "all" | AIGatewayProvider.Type["type"]
>("evals-selected-provider", "all");

const selectedEvalTemplatesAtom = atomWithStorage<string[]>(
  "evals-selected-templates",
  [],
);

const selectedModelsAtom = atomWithStorage<AIGatewayModel.URI[]>(
  "evals-selected-models",
  [],
);

export const Route = createFileRoute("/evals")({
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
  const [isCreating, setIsCreating] = useState(false);

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

  const handleToggleModel = (modelURI: AIGatewayModel.URI) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelURI)) {
      newSelected.delete(modelURI);
    } else {
      newSelected.add(modelURI);
    }
    setSelectedModelsArray([...newSelected]);
  };

  const handleRunEvals = async () => {
    if (selectedEvalTemplates.size === 0) {
      toast.error("Please select at least one eval template");
      return;
    }

    if (selectedModels.size === 0) {
      toast.error("Please select at least one model");
      return;
    }

    setIsCreating(true);

    const totalProjects = selectedEvalTemplates.size * selectedModels.size;

    try {
      const createdProjects = [];

      for (const templateName of selectedEvalTemplates) {
        const template = evalTemplateGroups
          ?.flatMap((g) => g.templates)
          .find((t) => t.name === templateName);
        if (!template) {
          continue;
        }

        for (const modelURI of selectedModels) {
          const messageId = StoreId.newMessageId();
          const sessionId = StoreId.newSessionId();
          const createdAt = new Date();

          const project = await createFromEvalMutation.mutateAsync({
            evalName: template.name,
            iconName: template.iconName,
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
                  text: template.prompt,
                  type: "text",
                },
              ],
              role: "user",
            },
            modelURI,
            sessionId,
          });
          createdProjects.push(project);
        }
      }

      toast.success(`Successfully created all ${totalProjects} projects`);

      if (createdProjects.length === 1 && createdProjects[0]) {
        void navigate({
          params: { subdomain: createdProjects[0].subdomain },
          to: "/projects/$subdomain",
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

  if (modelsIsLoading || evalTemplateGroupsIsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading...</p>
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

  const selectedModelsList = models?.filter((m) => selectedModels.has(m.uri));
  const totalProjectsToCreate =
    selectedEvalTemplates.size * selectedModels.size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Evals</h1>
          <p className="text-sm text-muted-foreground">
            Run evaluation prompts across multiple models to compare results.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            disabled={
              selectedEvalTemplates.size === 0 ||
              selectedModels.size === 0 ||
              isCreating
            }
            onClick={handleRunEvals}
            size="lg"
          >
            {isCreating
              ? `Creating (${totalProjectsToCreate})...`
              : `Run Evals (${totalProjectsToCreate})`}
          </Button>
          <div className="text-xs text-muted-foreground text-right">
            {totalProjectsToCreate > 0 ? (
              <>
                {selectedEvalTemplates.size} template
                {selectedEvalTemplates.size === 1 ? "" : "s"} ×{" "}
                {selectedModels.size} model
                {selectedModels.size === 1 ? "" : "s"}
              </>
            ) : (
              "Select templates and models"
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Eval Templates</h2>
          <Accordion className="border rounded-lg" type="multiple">
            {evalTemplateGroups?.map((group) => (
              <AccordionItem key={group.name} value={group.name}>
                <AccordionTrigger className="px-4">
                  <span className="text-sm font-medium">{group.name}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="divide-y">
                    {group.templates.map((template) => {
                      const IconComponent = IconMap[template.iconName];
                      return (
                        <div
                          className="px-4 py-3 hover:bg-muted/50 cursor-pointer"
                          key={template.name}
                          onClick={() => {
                            handleToggleEvalTemplate(template.name);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedEvalTemplates.has(template.name)}
                              className="mt-1"
                              id={`eval-template-${template.name}`}
                            />
                            <IconComponent className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium">
                                {template.name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.prompt}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Models</h2>

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
                                  {model.canonicalId}
                                </span>
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
          {selectedModelsList && selectedModelsList.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selected Models
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedModelsList.map((model) => (
                  <div
                    className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded text-xs"
                    key={model.uri}
                  >
                    <AIProviderIcon
                      className="size-3 opacity-90"
                      type={model.params.provider}
                    />
                    <span className="truncate max-w-48">
                      {model.canonicalId}
                    </span>
                    <button
                      className="hover:text-foreground text-muted-foreground"
                      onClick={() => {
                        handleToggleModel(model.uri);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
