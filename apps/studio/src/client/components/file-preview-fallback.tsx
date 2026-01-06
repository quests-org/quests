import { FileIcon } from "./file-icon";

export function FilePreviewFallback({
  fallbackExtension,
  filename,
}: {
  fallbackExtension?: string;
  filename: string;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-32 items-center justify-center rounded-lg bg-background">
        <FileIcon
          className="size-16"
          fallbackExtension={fallbackExtension}
          filename={filename}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-white">Preview not available</p>
        <p className="mt-1 text-xs text-white/60">
          Use the download button below to save this file
        </p>
      </div>
    </div>
  );
}
