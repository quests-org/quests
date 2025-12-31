import { FileIcon } from "./file-icon";

export function FilePreviewFallback({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType?: string;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-32 items-center justify-center rounded-lg bg-background">
        <FileIcon className="size-16" filename={filename} mimeType={mimeType} />
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
