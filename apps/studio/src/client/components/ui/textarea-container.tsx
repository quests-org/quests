import { cn } from "@/client/lib/utils";
import * as React from "react";

interface TextareaContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

/**
 * This is a custom component that breaks up the styles of a text area between
 * a container and and an inner input so that you can add additional controls
 * within the same styles.
 */
function TextareaContainer({
  children,
  className,
  ...props
}: TextareaContainerProps) {
  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 relative flex min-h-16 w-full rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] flex-col dark:bg-input/30 px-2 py-2",
        className,
      )}
      data-slot="textarea-container"
      {...props}
    >
      {children}
    </div>
  );
}

function TextareaInner({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "placeholder:text-muted-foreground aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex-1 field-sizing-content bg-transparent text-sm outline-none resize-none disabled:cursor-not-allowed disabled:opacity-50 border-0",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { TextareaContainer, TextareaInner };
