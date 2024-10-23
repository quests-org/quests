import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

import { rpcClient } from "../rpc/client";
import { useTabs } from "./use-tabs";

export function useTrashApp({
  navigateOnDelete,
}: {
  navigateOnDelete?: boolean;
}) {
  const trashProjectMutation = useMutation(
    rpcClient.workspace.project.trash.mutationOptions(),
  );
  const { addTab, closeTab, data: tabState, selectTab } = useTabs();

  const trashApp = useCallback(
    async (projectSubdomain: ProjectSubdomain) => {
      await trashProjectMutation.mutateAsync({
        subdomain: projectSubdomain,
      });

      const projectTabs = tabState.tabs.filter((tab) =>
        tab.pathname.includes(`/projects/${projectSubdomain}`),
      );

      if (navigateOnDelete) {
        // Try to find an existing new tab and navigate to it
        const newTab = tabState.tabs.find(
          (tab) => tab.pathname === "/new-tab" || tab.pathname === "/",
        );

        // Navigate to existing new tab or create a new one
        await (newTab
          ? selectTab({ id: newTab.id })
          : addTab({ urlPath: "/new-tab" }));
      }

      // Close all project-related tabs
      for (const tab of projectTabs) {
        await closeTab({ id: tab.id });
      }
    },
    [
      trashProjectMutation,
      tabState.tabs,
      closeTab,
      addTab,
      selectTab,
      navigateOnDelete,
    ],
  );

  return {
    error: trashProjectMutation.error,
    isPending: trashProjectMutation.isPending,
    trashApp,
  };
}
