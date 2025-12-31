import { useState } from "react";

import { FilePreviewFallback } from "./file-preview-fallback";

export function PdfViewer({
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
    <iframe
      className="h-full max-h-full w-full max-w-full rounded border border-white/10"
      key={url}
      onError={() => {
        setHasError(true);
      }}
      src={url}
      title={filename}
    />
  );
}
