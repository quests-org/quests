import { CodeBlock } from "./code-block";

export function ScrollableCodeBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CodeBlock className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto bg-background/50 p-2 rounded border">
      {children}
    </CodeBlock>
  );
}
