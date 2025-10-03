import { featuresAtom } from "@/client/atoms/features";
import { hasAIProviderAtom } from "@/client/atoms/has-ai-provider";
import { userAtom } from "@/client/atoms/user";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";

const shownErrorMessages = new Set<string>();
let shownEnabledForAIMessages = false;

export function useUserSessionNotifications() {
  const [userResult] = useAtom(userAtom);
  const hasAIProvider = useAtomValue(hasAIProviderAtom);
  const features = useAtomValue(featuresAtom);
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();

  useEffect(() => {
    if (!features.questsAccounts) {
      return;
    }

    if (
      userResult.error?.code === "SERVER_CONNECTION_ERROR" &&
      !shownErrorMessages.has(userResult.error.code)
    ) {
      shownErrorMessages.add(userResult.error.code);
      toast.error(userResult.error.message, {
        closeButton: true,
        dismissible: true,
        duration: Infinity,
      });
    }

    if (!hasAIProvider && !shownEnabledForAIMessages) {
      toast.info("Sign in or add an API key to use AI features.", {
        action: {
          label: "Setup",
          onClick: () => {
            const location = router.buildLocation({
              to: "/login",
            });
            addTab({ urlPath: location.href });
          },
        },
        closeButton: true,
        dismissible: true,
        duration: Infinity,
      });
      shownEnabledForAIMessages = true;
    } else {
      toast.info("Add an API key to use AI features.", {
        closeButton: true,
        dismissible: true,
        duration: Infinity,
      });
    }

    if (
      userResult.error?.code === "UNKNOWN_IPC_ERROR" &&
      !shownErrorMessages.has(userResult.error.code)
    ) {
      shownErrorMessages.add(userResult.error.code);
      toast.error(userResult.error.message, {
        closeButton: true,
        dismissible: true,
        duration: Infinity,
      });
    }
  }, [
    userResult.data?.id,
    userResult.error?.code,
    userResult.error?.message,
    addTab,
    features.questsAccounts,
    hasAIProvider,
    router,
  ]);
}
