import { cn } from "@/client/lib/utils";
import { useState } from "react";

import { FileIcon } from "./file-icon";

export function ImageWithFallback({
  alt,
  className,
  fallback,
  fallbackClassName,
  filename,
  onError,
  src,
  ...props
}: Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "onError" | "src"
> & {
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  fallbackClassName?: string;
  filename: string;
  onError?: () => void;
  src: string;
}) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={cn("flex items-center justify-center", fallbackClassName)}
      >
        <FileIcon
          className="size-[70%] text-muted-foreground"
          fallbackExtension="jpg"
          filename={filename}
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
