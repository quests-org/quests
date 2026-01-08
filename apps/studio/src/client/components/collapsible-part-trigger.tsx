import { forwardRef, type ReactNode } from "react";

import { Button } from "./ui/button";

export const CollapsiblePartTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  return (
    <Button
      className="hover:bg-accent/30i h-6 w-full justify-start rounded-sm px-1 py-0 disabled:opacity-100"
      ref={ref}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
});

CollapsiblePartTrigger.displayName = "CollapsiblePartTrigger";
