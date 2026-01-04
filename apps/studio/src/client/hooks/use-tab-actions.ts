import { rpcClient, type RPCInput } from "@/client/rpc/client";
import { type StudioPath } from "@/shared/studio-path";
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
      return locationToAppPath(location);
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
        return rpcClient.tabs.add.call({
          ...options,
          appPath: buildUrlPath(opts),
        });
      },
      closeTab: (input: RPCInput["tabs"]["close"]) =>
        rpcClient.tabs.close.call(input),
      navigateTab: <
        TTo extends string | undefined,
        TFrom extends string = string,
        TMaskFrom extends string = TFrom,
        TMaskTo extends string = "",
      >(
        opts: ToOptions<RegisteredRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
        options?: Omit<RPCInput["tabs"]["navigate"], "appPath">,
      ) => {
        return rpcClient.tabs.navigate.call({
          ...options,
          appPath: buildUrlPath(opts),
        });
      },
      reorderTabs: (input: RPCInput["tabs"]["reorder"]) =>
        rpcClient.tabs.reorder.call(input),
      selectTab: (input: RPCInput["tabs"]["select"]) =>
        rpcClient.tabs.select.call(input),
    };
  }, [router]);
}

function locationToAppPath(location: ParsedLocation) {
  if (!location.href.startsWith("/")) {
    throw new Error("Invalid location href");
  }
  return location.href as StudioPath;
}
