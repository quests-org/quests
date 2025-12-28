import { Kbd } from "@/client/components/ui/kbd";
import { isMacOS } from "@/client/lib/utils";

export function NewTabHelpMessage() {
  return (
    <p className="text-xs text-muted-foreground">
      Hold <Kbd>{isMacOS() ? "⌘" : "Ctrl"}</Kbd> to create in a new tab
    </p>
  );
}
