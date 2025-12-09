import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import { atom } from "jotai";

interface ExceptionItem {
  content: string;
  expanded: boolean;
  firstLine: string;
  timestamp: number;
}

export const serverExceptionsAtom = atom<ExceptionItem[]>([]);

async function listen(
  setAtom: (update: (prev: ExceptionItem[]) => ExceptionItem[]) => void,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const subscription = await vanillaRpcClient.utils.live.serverExceptions();

    for await (const exception of subscription) {
      const content = exception.stack || exception.message;
      const firstLine = content.split("\n")[0] || content;

      setAtom((prev) => [
        ...prev,
        {
          content,
          expanded: false,
          firstLine,
          timestamp: Date.now(),
        },
      ]);
    }
  } catch (error) {
    logger.error("Failed to subscribe to server exceptions:", error);
  }
}

serverExceptionsAtom.onMount = (setAtom) => {
  listen(setAtom).catch((error: unknown) => {
    logger.error("Error listening to server exceptions", error);
  });
};
