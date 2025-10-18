import { ExternalLink } from "lucide-react";

export function ProviderLinks({
  keyURL,
  name,
  url,
}: {
  keyURL?: string;
  name: string;
  url: string;
}) {
  return (
    <div className="flex items-center gap-x-1 text-xs text-muted-foreground">
      {keyURL && (
        <>
          <span>
            Get your {name}{" "}
            <a
              className="inline-flex items-center gap-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
              href={keyURL}
              rel="noopener noreferrer"
              target="_blank"
            >
              API key
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>
          <span>or</span>
        </>
      )}
      <span>
        <a
          className="inline-flex items-center gap-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {keyURL ? "learn more" : "Learn more"}
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        about {name}
      </span>
    </div>
  );
}
