export function MonoText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`font-mono ${className}`}>{children}</div>;
}
