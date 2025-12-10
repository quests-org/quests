import { type RPCInput, vanillaRpcClient } from "@/client/rpc/client";
import { type MainAppPath } from "@/shared/main-app-path";
import {
  type ParsedLocation,
  type RegisteredRouter,
  type ToOptions,
  useRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";

export function useTabActions() {
  const router = useRouter();

  return useMemo(() => {
    const buildUrlPath = <
      TTo extends string | undefined,
      TFrom extends string = string,
      TMaskFrom extends string = TFrom,
      TMaskTo extends string = "",
    >(
      opts: ToOptions<RegisteredRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
    ) => {
      const location = router.buildLocation(
        opts as Parameters<typeof router.buildLocation>[0],
      );
      return parsedLocationToMainAppPath(location);
    };

    return {
      addTab: <
        TTo extends string | undefined,
        TFrom extends string = string,
        TMaskFrom extends string = TFrom,
        TMaskTo extends string = "",
      >(
        opts: ToOptions<RegisteredRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
        options?: Omit<RPCInput["tabs"]["add"], "appPath">,
      ) => {
        return vanillaRpcClient.tabs.add({
          ...options,
          appPath: buildUrlPath(opts),
        });
      },
      closeTab: vanillaRpcClient.tabs.close,
      navigateTab: <
        TTo extends string | undefined,
        TFrom extends string = string,
        TMaskFrom extends string = TFrom,
        TMaskTo extends string = "",
      >(
        opts: ToOptions<RegisteredRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
        options?: Omit<RPCInput["tabs"]["navigate"], "appPath">,
      ) => {
        return vanillaRpcClient.tabs.navigate({
          ...options,
          appPath: buildUrlPath(opts),
        });
      },
      reorderTabs: vanillaRpcClient.tabs.reorder,
      selectTab: vanillaRpcClient.tabs.select,
    };
  }, [router]);
}

function parsedLocationToMainAppPath(location: ParsedLocation) {
  if (!location.href.startsWith("/")) {
    throw new Error("Invalid location href");
  }
  return location.href as MainAppPath;
}
