import { cn } from "../lib/utils";

export function SandboxedHtmlIframe({
  className,
  htmlContent,
  restrictInteractive = false,
  src,
  style,
  title,
}: {
  className?: string;
  htmlContent?: string;
  restrictInteractive?: boolean;
  src: string;
  style?: React.CSSProperties;
  title: string;
}) {
  const sandbox = restrictInteractive
    ? "allow-downloads allow-forms allow-scripts"
    : "allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts allow-presentation";

  const allow = restrictInteractive
    ? "accelerometer; autoplay; encrypted-media"
    : "accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking";

  return (
    <iframe
      allow={allow}
      className={cn("bg-white", className)}
      sandbox={sandbox}
      src={src}
      srcDoc={htmlContent}
      style={style}
      title={title}
    />
  );
}
