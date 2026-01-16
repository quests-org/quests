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
  showCheckerboard = false,
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
  showCheckerboard?: boolean;
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
      style={{
        ...props.style,
        ...(showCheckerboard && {
          backgroundColor: "#f5f5f5",
          backgroundImage: `
            linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
            linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
            linear-gradient(-45deg, transparent 75%, #d0d0d0 75%)
          `,
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundSize: "16px 16px",
        }),
      }}
    />
  );
}
