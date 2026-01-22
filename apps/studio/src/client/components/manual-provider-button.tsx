import { Button } from "@/client/components/ui/button";

export function ManualProviderButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-sm text-muted-foreground/50">or</div>
      <Button
        className="text-muted-foreground/80"
        onClick={onClick}
        type="button"
        variant="ghost"
      >
        Add an AI provider manually
      </Button>
    </div>
  );
}
