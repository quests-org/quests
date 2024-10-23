import { handlers } from "@/client/lib/api";
import { Download } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { vanillaRpcClient } from "../rpc/client";

export function useUpdateNotifications() {
  const shownUpdateToastRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const listeners = [
      handlers.updateDownloaded.listen(({ updateInfo }) => {
        const updateId = updateInfo.version;

        // Prevent showing multiple toasts for the same update
        if (shownUpdateToastRef.current.has(updateId)) {
          return;
        }

        shownUpdateToastRef.current.add(updateId);

        toast.info("Update is ready to install", {
          action: {
            label: "Install Now",
            onClick: () => {
              try {
                void vanillaRpcClient.preferences.quitAndInstall();
              } catch {
                toast.error("Failed to install update. Please try again.");
              }
            },
          },
          description: "The app will restart to complete the update.",
          duration: Infinity,
          icon: <Download className="h-5 w-5" />,
        });
      }),
      handlers.updateCheckStarted.listen(() => {
        toast.info("Checking for updates...");
      }),
      handlers.updateNotAvailable.listen(() => {
        toast.info("No updates available");
      }),
      handlers.testNotification.listen(() => {
        toast.info("Test notification");
      }),
    ];

    return () => {
      for (const unsubscribe of listeners) {
        unsubscribe();
      }
    };
  }, []);
}
