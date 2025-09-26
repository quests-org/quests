import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { getPromptValueStorageKey } from "../atoms/prompt-value";
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
  const router = useRouter();

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
        if (newTab) {
          await selectTab({ id: newTab.id });
        } else {
          const location = router.buildLocation({
            to: "/new-tab",
          });
          await addTab({ urlPath: location.href });
        }
      }

      // Close all project-related tabs
      for (const tab of projectTabs) {
        await closeTab({ id: tab.id });
      }

      // Clean up prompt value storage for the deleted project
      localStorage.removeItem(getPromptValueStorageKey(projectSubdomain));
    },
    [
      trashProjectMutation,
      tabState.tabs,
      closeTab,
      addTab,
      selectTab,
      navigateOnDelete,
      router,
    ],
  );

  return {
    error: trashProjectMutation.error,
    isPending: trashProjectMutation.isPending,
    trashApp,
  };
}
