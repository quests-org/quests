import { useState } from "react";

import { FilePreviewFallback } from "./file-preview-fallback";

export function AudioViewer({
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
    <audio
      className="w-full max-w-2xl"
      controls
      key={url}
      onError={() => {
        setHasError(true);
      }}
      src={url}
    />
  );
}
