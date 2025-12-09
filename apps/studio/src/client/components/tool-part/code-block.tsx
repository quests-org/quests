export function CodeBlock({
  children,
  className = "text-xs whitespace-pre-wrap",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <pre className={`font-mono ${className}`}>{children}</pre>;
}
