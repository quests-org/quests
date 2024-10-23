import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import { ORPCError } from "@orpc/client";
import { atomWithRefresh } from "jotai/utils";

async function listen(setAtom: () => void) {
  const iterator = await vanillaRpcClient.user.live.me();
  for await (const _payload of iterator) {
    setAtom();
  }
}

export const userAtom = atomWithRefresh(async () => {
  return await vanillaRpcClient.user.me({});
});

userAtom.onMount = (setAtom) => {
  listen(setAtom).catch((error: unknown) => {
    if (error instanceof ORPCError) {
      logger.error(error.name, error.code, error.message, error.cause);
    } else {
      logger.error(`Error listening to auth session changed`, error);
    }
  });
};
