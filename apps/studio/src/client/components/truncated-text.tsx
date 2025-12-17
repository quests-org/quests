import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function TruncatedText({
  children,
  className,
  maxLength,
}: {
  children: string;
  className?: string;
  maxLength: number;
}) {
  const isTruncated = children.length > maxLength;
  const displayText = isTruncated
    ? truncateMiddle(children, maxLength)
    : children;

  if (!isTruncated) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{displayText}</span>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-[min(500px,90vw)] wrap-break-word"
        collisionPadding={10}
      >
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const ellipsis = "…";
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    str.slice(0, frontChars) + ellipsis + str.slice(str.length - backChars)
  );
}
