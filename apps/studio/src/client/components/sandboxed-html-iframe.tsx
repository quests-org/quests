export function SandboxedHtmlIframe({
  className,
  htmlContent,
  src,
  style,
  title,
}: {
  className?: string;
  htmlContent?: string;
  src?: string;
  style?: React.CSSProperties;
  title: string;
}) {
  return (
    <iframe
      allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
      className={className}
      sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts allow-presentation"
      src={src}
      srcDoc={htmlContent}
      style={style}
      title={title}
    />
  );
}
