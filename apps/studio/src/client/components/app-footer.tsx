import { ExternalLink } from "@/client/components/external-link";
import {
  APP_REPO_URL,
  DISCORD_URL,
  NEW_ISSUE_URL,
  PRODUCT_NAME,
} from "@quests/shared";

export function AppFooter() {
  return (
    <footer className="w-full px-8 py-4">
      <p className="text-center text-xs text-muted-foreground">
        {PRODUCT_NAME} is{" "}
        <ExternalLink
          className="transition-colors hover:text-foreground hover:underline"
          href={APP_REPO_URL}
        >
          open source
        </ExternalLink>
        <span className="mx-2">·</span>
        <ExternalLink
          className="transition-colors hover:text-foreground hover:underline"
          href={DISCORD_URL}
        >
          Join us on Discord
        </ExternalLink>
        <span className="mx-2">·</span>
        <ExternalLink
          className="transition-colors hover:text-foreground hover:underline"
          href={NEW_ISSUE_URL}
        >
          Report an issue
        </ExternalLink>
      </p>
    </footer>
  );
}
