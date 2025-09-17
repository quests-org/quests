import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useUpdateNotifications() {
  const shownUpdateToastRef = useRef<Set<string>>(new Set());

  const { data: updateDownloaded } = useQuery(
    rpcClient.updates.live.downloaded.experimental_liveOptions(),
  );
  const { data: updateCheckStarted } = useQuery(
    rpcClient.updates.live.checkStarted.experimental_liveOptions(),
  );
  const { data: updateNotAvailable } = useQuery(
    rpcClient.updates.live.notAvailable.experimental_liveOptions(),
  );
  const { data: testNotification } = useQuery(
    rpcClient.debug.live.testNotification.experimental_liveOptions(),
  );

  useEffect(() => {
    if (updateDownloaded) {
      const updateId = updateDownloaded.updateInfo.version;

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
    }
  }, [updateDownloaded]);

  useEffect(() => {
    if (updateCheckStarted) {
      toast.info("Checking for updates...");
    }
  }, [updateCheckStarted]);

  useEffect(() => {
    if (updateNotAvailable) {
      toast.info("No updates available");
    }
  }, [updateNotAvailable]);

  useEffect(() => {
    if (testNotification) {
      toast.info("Test notification");
    }
  }, [testNotification]);
}
