import { forwardRef, type ReactNode } from "react";

import { Button } from "./ui/button";

export const CollapsiblePartTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  return (
    <Button
      className="h-6 px-1 py-0 w-full justify-start hover:bg-accent/30 rounded-sm"
      ref={ref}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
});

CollapsiblePartTrigger.displayName = "CollapsiblePartTrigger";
