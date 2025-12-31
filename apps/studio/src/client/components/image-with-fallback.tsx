import { cn } from "@/client/lib/utils";
import { useState } from "react";

import { FileIcon } from "./file-icon";

export function ImageWithFallback({
  alt,
  className,
  fallbackClassName,
  filename,
  mimeType,
  onError,
  src,
  ...props
}: Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "onError" | "src"
> & {
  alt: string;
  className?: string;
  fallbackClassName?: string;
  filename: string;
  mimeType?: string;
  onError?: () => void;
  src: string;
}) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted",
          fallbackClassName,
        )}
      >
        <FileIcon
          className="size-[70%] text-muted-foreground"
          filename={filename}
          mimeType={mimeType}
        />
      </div>
    );
  }

  return (
    <img
      {...props}
      alt={alt}
      className={className}
      onError={handleError}
      src={src}
    />
  );
}
