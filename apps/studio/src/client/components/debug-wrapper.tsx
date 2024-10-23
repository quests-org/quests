import { Bug } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

import { JsonViewer } from "./json-viewer";
import { Button } from "./ui/button";

interface DebugWrapperProps {
  children: ReactNode;
  data: unknown;
  label?: string;
}

export function DebugWrapper({ children, data, label }: DebugWrapperProps) {
  const [showModal, setShowModal] = useState(false);

  const isDebugEnabled = import.meta.env.DEV;

  const handleDebugClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!isDebugEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative group">
        {children}

        <Button
          className="absolute right-0 top-0 h-auto rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1 py-0.5"
          onClick={handleDebugClick}
          size="sm"
          title="Debug part"
          variant="warning"
        >
          <Bug className="size-2.5" />
          {label && <span className="text-[10px] font-medium">{label}</span>}
        </Button>
      </div>

      <JsonViewer
        data={data}
        downloadFilename={`debug-data-${label || "data"}`}
        onOpenChange={handleModalClose}
        open={showModal}
        title={label || "Debug"}
      />
    </>
  );
}
