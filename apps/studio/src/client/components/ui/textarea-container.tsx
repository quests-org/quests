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
        "relative flex min-h-16 w-full flex-col rounded-md border border-input bg-transparent p-2 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
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
        "field-sizing-content flex-1 resize-none border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { TextareaContainer, TextareaInner };
