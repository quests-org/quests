import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { useEffect, useRef, useState } from "react";

interface ErrorConsoleProps {
  className?: string;
  errors: HeartbeatResponse["errors"];
}

export function ErrorConsole({ className = "", errors }: ErrorConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (!hasScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [errors, hasScrolled]);

  if (errors.length === 0) {
    return null;
  }

  const sortedErrors = [...errors].sort((a, b) => {
    const aTime = a.createdAt || 0;
    const bTime = b.createdAt || 0;
    return aTime - bTime;
  });

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-sm border border-gray-200 ${className}`}
    >
      <div
        className="flex-1 overflow-y-auto bg-gray-50 font-mono text-sm"
        onScroll={(e) => {
          const target = e.currentTarget;
          const isAtBottom =
            target.scrollHeight - target.scrollTop === target.clientHeight;
          setHasScrolled(!isAtBottom);
        }}
        ref={scrollRef}
      >
        {sortedErrors.map((error, index) => (
          <div
            className="border-b border-gray-200 p-4 last:border-0"
            key={error.createdAt || index}
          >
            <div className="flex items-start gap-3">
              <span
                className={`whitespace-nowrap font-medium ${getErrorTypeClass(error.type)}`}
              >
                [{error.type}]
              </span>
              <span className="break-all text-gray-700">{error.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getErrorTypeClass(type: string) {
  switch (type) {
    case "client": {
      return "text-blue-600";
    }
    case "router": {
      return "text-amber-600";
    }
    case "runtime": {
      return "text-red-600";
    }
    default: {
      return "text-gray-600";
    }
  }
}
