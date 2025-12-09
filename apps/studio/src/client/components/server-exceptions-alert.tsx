import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/client/components/ui/accordion";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, X } from "lucide-react";
import { isEqual } from "radashi";
import { useMemo } from "react";

interface GroupedExceptionItem {
  content: string;
  count: number;
  firstLine: string;
  id: string;
}

export function ServerExceptionsAlert() {
  const { data: serverExceptions } = useQuery(
    rpcClient.utils.live.serverExceptions.experimental_liveOptions({}),
  );

  const groupedExceptions = useMemo<GroupedExceptionItem[]>(() => {
    if (!serverExceptions) {
      return [];
    }

    const groups: GroupedExceptionItem[] = [];

    for (const exception of serverExceptions) {
      const content = exception.stack || exception.message;
      const firstLine = content.split("\n")[0] || content;
      const firstLineWithoutErrorPrefix = firstLine.replace(/^Error:\s*/i, "");

      const existingGroup = groups.find((group) =>
        isEqual(
          { content: group.content, firstLine: group.firstLine },
          { content, firstLine: firstLineWithoutErrorPrefix },
        ),
      );

      if (existingGroup) {
        existingGroup.count++;
      } else {
        groups.push({
          content,
          count: 1,
          firstLine: firstLineWithoutErrorPrefix,
          id: exception.id,
        });
      }
    }

    return groups;
  }, [serverExceptions]);

  const { mutate: clearExceptions } = useMutation(
    rpcClient.utils.clearExceptions.mutationOptions({}),
  );

  if (groupedExceptions.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-background">
      <div className="px-3 py-1.5 flex items-center gap-2 bg-muted/30 border-b">
        <AlertCircle className="size-3.5 text-destructive shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1">
          Server {groupedExceptions.length === 1 ? "Exception" : "Exceptions"}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-5"
              onClick={() => {
                clearExceptions();
              }}
              size="icon"
              variant="ghost"
            >
              <X className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="max-h-32 overflow-y-auto">
        <Accordion className="border-0" type="multiple">
          {groupedExceptions.map((exception) => (
            <AccordionItem
              className="border-b last:border-b-0"
              key={exception.id}
              value={exception.id}
            >
              <AccordionTrigger className="py-1.5 px-3 hover:bg-muted/50 transition-colors gap-2 hover:no-underline data-[state=open]:bg-muted/50 min-w-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {exception.count > 1 && (
                    <Badge
                      className="px-1 py-0 h-3.5 min-w-[14px] text-[9px] flex items-center justify-center shrink-0 tabular-nums"
                      variant="secondary"
                    >
                      {exception.count}
                    </Badge>
                  )}
                  <span className="font-mono text-[11px] leading-tight truncate text-left text-foreground/90 block overflow-hidden">
                    {exception.firstLine}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-2 px-3">
                <pre className="text-[10px] leading-snug bg-muted/50 p-1.5 rounded border wrap-break-word whitespace-pre-wrap font-mono text-foreground/80">
                  {exception.content}
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
