import { Circle, Square } from "lucide-react";

export function StopIcon({ className }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <Circle className={className} />
      <Square className="size-2 fill-current absolute inset-0 m-auto" />
    </div>
  );
}
