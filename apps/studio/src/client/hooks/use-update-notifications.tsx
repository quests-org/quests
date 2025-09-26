import { Progress } from "@/client/components/ui/progress";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CHECKING_FOR_UPDATES_TOAST_ID = "checking-for-updates";
const DOWNLOAD_TOAST_ID = "download";
const INSTALL_TOAST_ID = "install";

export function useUpdateNotifications() {
  const hasUpdateCheckStarted = useRef(false);
  const isDownloadToastDismissed = useRef(false);

  const { data: updateDownloaded } = useQuery(
    rpcClient.updates.live.downloaded.experimental_streamedOptions(),
  );
  const { data: updateCheckStarted } = useQuery(
    rpcClient.updates.live.checkStarted.experimental_streamedOptions(),
  );
  const { data: updateNotAvailable } = useQuery(
    rpcClient.updates.live.notAvailable.experimental_streamedOptions(),
  );
  const { data: testNotification } = useQuery(
    rpcClient.debug.live.testNotification.experimental_streamedOptions(),
  );
  const { data: updateError } = useQuery(
    rpcClient.updates.live.error.experimental_streamedOptions(),
  );
  const { data: updateCancelled } = useQuery(
    rpcClient.updates.live.cancelled.experimental_streamedOptions(),
  );
  const { data: updateDownloadProgress } = useQuery(
    rpcClient.updates.live.progress.experimental_liveOptions(),
  );

  useEffect(() => {
    if (updateDownloaded) {
      const updateId = updateDownloaded.at(-1)?.updateInfo.version;

      if (!updateId) {
        return;
      }

      isDownloadToastDismissed.current = false;
      toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
      toast.dismiss(DOWNLOAD_TOAST_ID);
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
        closeButton: true,
        description: "The app will restart to complete the update.",
        duration: Infinity,
        icon: <Download className="h-5 w-5" />,
        id: INSTALL_TOAST_ID,
      });
    }
  }, [updateDownloaded]);

  useEffect(() => {
    if (updateCheckStarted) {
      hasUpdateCheckStarted.current = true;
      isDownloadToastDismissed.current = false;
      toast.info("Checking for updates...", {
        closeButton: true,
        duration: 2000,
        id: CHECKING_FOR_UPDATES_TOAST_ID,
      });
    }
  }, [updateCheckStarted]);

  useEffect(() => {
    if (
      updateDownloadProgress &&
      updateDownloadProgress.progress.percent > 0 &&
      !isDownloadToastDismissed.current
    ) {
      toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);

      toast.info("Downloading update...", {
        classNames: {
          content: "w-full",
          description: "w-full",
        },
        closeButton: true,
        description: (
          <div className="w-full min-w-0 space-y-2">
            <Progress
              className="h-1 w-full"
              value={updateDownloadProgress.progress.percent}
            />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(updateDownloadProgress.progress.percent)}%
            </div>
          </div>
        ),
        duration: Infinity,
        id: DOWNLOAD_TOAST_ID,
        onDismiss: () => {
          isDownloadToastDismissed.current = true;
        },
      });
    }
  }, [updateDownloadProgress]);

  useEffect(() => {
    if (updateNotAvailable) {
      toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
      toast.dismiss(DOWNLOAD_TOAST_ID);
      toast.info("No updates available", {
        closeButton: true,
      });
    }
  }, [updateNotAvailable]);

  useEffect(() => {
    if (testNotification) {
      toast.info("Test notification", {
        closeButton: true,
      });
    }
  }, [testNotification]);

  useEffect(() => {
    if (updateError && hasUpdateCheckStarted.current) {
      toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
      toast.dismiss(DOWNLOAD_TOAST_ID);
      toast.error("Update failed", {
        action: {
          label: "Download manually",
          onClick: () => {
            window.open("https://quests.dev/download", "_blank");
          },
        },
        closeButton: true,
        description: updateError.at(-1)?.error.message,
        duration: Infinity,
      });
    }
  }, [updateError]);

  useEffect(() => {
    if (updateCancelled) {
      toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
      toast.dismiss(DOWNLOAD_TOAST_ID);
      toast.info("Update cancelled", {
        closeButton: true,
        description: `Updating to version ${updateCancelled.at(-1)?.updateInfo.version ?? "unknown"} was cancelled.`,
      });
    }
  }, [updateCancelled]);
}
