import { useState } from "react";

import { FilePreviewFallback } from "./file-preview-fallback";

export function VideoViewer({
  filename,
  url,
}: {
  filename: string;
  url: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <FilePreviewFallback filename={filename} />;
  }

  return (
    <video
      className="max-h-full max-w-full rounded border border-white/10"
      controls
      key={url}
      onError={() => {
        setHasError(true);
      }}
      src={url}
    />
  );
}
