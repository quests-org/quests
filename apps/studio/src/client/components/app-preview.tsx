import { AppIFrame } from "@/client/components/app-iframe";
import { AppToolbar } from "@/client/components/app-toolbar";
import { type WorkspaceAppPreview } from "@quests/workspace/client";
import { useRef } from "react";

interface AppPreviewProps {
  className?: string;
  onClose?: () => void;
  onOpenInQuests?: () => void;
  preview: WorkspaceAppPreview;
}

export function AppPreview({
  className = "flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden",
  preview,
}: AppPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className={className}>
      <AppToolbar app={preview} iframeRef={iframeRef} />
      <div className="min-h-0 flex-1">
        <AppIFrame app={preview} iframeRef={iframeRef} />
      </div>
    </div>
  );
}
