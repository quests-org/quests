import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

import { rpcClient } from "../rpc/client";
import { useTabActions } from "./use-tab-actions";
import { useTabs } from "./use-tabs";

export function useTrashApp({
  navigateOnDelete,
}: {
  navigateOnDelete?: boolean;
}) {
  const trashProjectMutation = useMutation(
    rpcClient.workspace.project.trash.mutationOptions(),
  );
  const { addTab, closeTab, selectTab } = useTabActions();
  const tabs = useTabs();

  const trashApp = useCallback(
    async (projectSubdomain: ProjectSubdomain) => {
      await trashProjectMutation.mutateAsync({
        subdomain: projectSubdomain,
      });

      const projectTabs = tabs.filter((tab) =>
        tab.pathname.includes(`/projects/${projectSubdomain}`),
      );

      if (navigateOnDelete) {
        const newTab = tabs.find(
          (tab) => tab.pathname === "/new-tab" || tab.pathname === "/",
        );

        await (newTab
          ? selectTab({ id: newTab.id })
          : addTab({ to: "/new-tab" }));
      }

      for (const tab of projectTabs) {
        await closeTab({ id: tab.id });
      }
    },
    [trashProjectMutation, tabs, closeTab, addTab, selectTab, navigateOnDelete],
  );

  return {
    error: trashProjectMutation.error,
    isPending: trashProjectMutation.isPending,
    trashApp,
  };
}
