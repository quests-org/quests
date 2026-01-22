import { ExternalLink } from "@/client/components/external-link";

export function TermsFooter({ className }: { className?: string }) {
  return (
    <p className={className}>
      By clicking continue, you agree to our{" "}
      <ExternalLink className="underline" href="https://quests.dev/terms">
        Terms of Service
      </ExternalLink>{" "}
      and{" "}
      <ExternalLink className="underline" href="https://quests.dev/privacy">
        Privacy Policy
      </ExternalLink>
      .
    </p>
  );
}
