import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { rpcClient } from "../rpc/client";
import { useTabActions, useTabs } from "./tabs";

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
  const router = useRouter();

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

        if (newTab) {
          await selectTab({ id: newTab.id });
        } else {
          const location = router.buildLocation({
            to: "/new-tab",
          });
          await addTab({ urlPath: location.href });
        }
      }

      for (const tab of projectTabs) {
        await closeTab({ id: tab.id });
      }
    },
    [
      trashProjectMutation,
      tabs,
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
