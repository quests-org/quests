import { CodeBlock } from "./code-block";

export function ScrollableCodeBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CodeBlock className="max-h-32 overflow-y-auto rounded-sm border bg-background/50 p-2 text-xs whitespace-pre-wrap">
      {children}
    </CodeBlock>
  );
}
