import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { rpcClient } from "../rpc/client";
import { useTabActions } from "./use-tab-actions";
import { useTabs } from "./use-tabs";

export function useTrashApp({
  navigateOnDelete,
}: {
  navigateOnDelete?: boolean;
}) {
  const queryClient = useQueryClient();
  const trashProjectMutation = useMutation(
    rpcClient.workspace.project.trash.mutationOptions(),
  );
  const { closeTab } = useTabActions();
  const tabs = useTabs();
  const navigate = useNavigate();

  const trashApp = useCallback(
    async (projectSubdomain: ProjectSubdomain) => {
      await trashProjectMutation.mutateAsync({
        subdomain: projectSubdomain,
      });

      // Not invalidating because live queries cannot be awaited
      // and the goal is to make callers go back into loading state
      queryClient.removeQueries({
        // .key() generates a wildcard key for any params
        queryKey: rpcClient.workspace.project.live.list.key(),
      });
      queryClient.removeQueries({
        // .key() generates a wildcard key for any params
        queryKey: rpcClient.workspace.app.state.bySubdomains.key(),
      });

      if (navigateOnDelete) {
        await navigate({ replace: true, to: "/new-tab" });
      } else {
        const projectTabs = tabs.filter((tab) =>
          tab.pathname.includes(`/projects/${projectSubdomain}`),
        );

        for (const tab of projectTabs) {
          await closeTab({ id: tab.id });
        }
      }
    },
    [
      trashProjectMutation,
      queryClient,
      tabs,
      closeTab,
      navigate,
      navigateOnDelete,
    ],
  );

  return {
    error: trashProjectMutation.error,
    isPending: trashProjectMutation.isPending,
    trashApp,
  };
}
