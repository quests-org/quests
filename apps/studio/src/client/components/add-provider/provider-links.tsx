const S = {
  link: "inline-flex items-center gap-x-0.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2",
} as const;

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
    <div className="text-xs text-muted-foreground">
      {keyURL ? (
        <>
          <span>
            <a
              className={S.link}
              href={keyURL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Get API key
            </a>
          </span>{" "}
          <span>or</span>{" "}
          <span>
            <a
              className={S.link}
              href={url}
              rel="noopener noreferrer"
              target="_blank"
            >
              learn more
            </a>{" "}
            about {name}.
          </span>
        </>
      ) : (
        <span>
          <a
            className={S.link}
            href={url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn more
          </a>{" "}
          about {name}.
        </span>
      )}
    </div>
  );
}
