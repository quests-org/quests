import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { vanillaRpcClient } from "../rpc/client";

export function useServerExceptionNotifications() {
  const lastExceptionContentRef = useRef<null | string>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    let isCancelled = false;

    async function subscribeToExceptions() {
      try {
        const subscription =
          await vanillaRpcClient.utils.live.serverExceptions();

        for await (const exception of subscription) {
          if (isCancelled) {
            break;
          }

          const currentExceptionContent = exception.stack || exception.message;

          if (lastExceptionContentRef.current === currentExceptionContent) {
            continue;
          }

          lastExceptionContentRef.current = currentExceptionContent;

          toast.error("Server Exception", {
            closeButton: true,
            description: (
              <div className="flex flex-col gap-1">
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {currentExceptionContent}
                </pre>
                <div className="text-muted-foreground text-xs">
                  See full error in server console
                </div>
              </div>
            ),
            dismissible: true,
            duration: Infinity,
            richColors: true,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("Failed to subscribe to server exceptions:", error);
        }
      }
    }

    void subscribeToExceptions();

    return () => {
      isCancelled = true;
    };
  }, []);
}
