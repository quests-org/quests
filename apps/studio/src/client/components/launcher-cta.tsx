import { Kbd } from "@/client/components/ui/kbd";
import { isMacOS } from "@/client/lib/utils";

export function LauncherCTA() {
  return (
    <p className="text-xs text-muted-foreground">
      Press <Kbd>{isMacOS() ? "⌘" : "Ctrl"}+K</Kbd> to quickly switch projects
    </p>
  );
}
