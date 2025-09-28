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
  const { data: updateState } = useQuery(
    rpcClient.updates.live.status.experimental_liveOptions(),
  );
  const { data: testNotification } = useQuery(
    rpcClient.debug.live.testNotification.experimental_streamedOptions(),
  );

  useEffect(() => {
    if (!updateState?.notifyUser) {
      return;
    }

    switch (updateState.type) {
      case "cancelled": {
        toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
        toast.dismiss(DOWNLOAD_TOAST_ID);
        toast.info("Update cancelled", {
          closeButton: true,
          description: `Updating to version ${updateState.updateInfo?.version ?? ""} was cancelled.`,
        });
        break;
      }
      case "checking": {
        hasUpdateCheckStarted.current = true;
        isDownloadToastDismissed.current = false;
        toast.info("Checking for updates...", {
          closeButton: true,
          duration: 2000,
          id: CHECKING_FOR_UPDATES_TOAST_ID,
        });
        break;
      }
      case "downloaded": {
        const updateId = updateState.updateInfo?.version;
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
        break;
      }
      case "downloading": {
        if (!isDownloadToastDismissed.current) {
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
                  value={updateState.progress.percent}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {updateState.progress.percent.toFixed(0)}%
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
        break;
      }
      case "error": {
        if (hasUpdateCheckStarted.current) {
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
            description:
              updateState.message.slice(0, 100) +
              (updateState.message.length > 100 ? "..." : ""),
            duration: Infinity,
          });
        }
        break;
      }
      case "installing": {
        toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
        toast.dismiss(DOWNLOAD_TOAST_ID);
        toast.info("Installing update...", {
          closeButton: true,
          description: updateState.notice,
          duration: Infinity,
        });
        break;
      }
      case "not-available": {
        toast.dismiss(CHECKING_FOR_UPDATES_TOAST_ID);
        toast.dismiss(DOWNLOAD_TOAST_ID);
        toast.info("No updates available", {
          closeButton: true,
        });
        break;
      }
    }
  }, [updateState]);

  useEffect(() => {
    if (testNotification) {
      toast.info("Test notification", {
        closeButton: true,
      });
    }
  }, [testNotification]);
}
