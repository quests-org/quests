import { AppIFrame } from "@/client/components/app-iframe";
import { AppToolbar } from "@/client/components/app-toolbar";
import { Button } from "@/client/components/ui/button";
import { type WorkspaceAppPreview } from "@quests/workspace/client";
import { Plus, X } from "lucide-react";
import { useRef } from "react";

interface AppPreviewProps {
  className?: string;
  onClose?: () => void;
  onOpenInQuests?: () => void;
  preview: WorkspaceAppPreview;
  showCloseButton?: boolean;
  showRemixButton?: boolean;
}

export function AppPreview({
  className = "flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden",
  onClose,
  onOpenInQuests,
  preview,
  showCloseButton = false,
  showRemixButton = true,
}: AppPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className={className}>
      <AppToolbar
        app={preview}
        className={showCloseButton ? "pr-2" : undefined}
        iframeRef={iframeRef}
        rightActions={
          <div className="flex gap-2 items-center">
            {showRemixButton && (
              <Button onClick={onOpenInQuests}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            )}

            {showCloseButton && onClose && (
              <Button onClick={onClose} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />
      <div className="min-h-0 flex-1">
        <AppIFrame app={preview} iframeRef={iframeRef} />
      </div>
    </div>
  );
}
