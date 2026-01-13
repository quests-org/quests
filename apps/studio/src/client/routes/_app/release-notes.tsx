import { ExternalLink } from "@/client/components/external-link";
import { Markdown } from "@/client/components/markdown";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { RELEASE_NOTES_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

export const Route = createFileRoute("/_app/release-notes")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Release Notes",
      },
      createIconMeta("file-text"),
    ],
  }),
});

function ErrorFallback() {
  return (
    <Card>
      <CardContent className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Failed to load release notes.</p>
        <Button
          asChild
          className="text-primary hover:text-primary/80"
          variant="link"
        >
          <ExternalLink href={RELEASE_NOTES_URL}>
            View release notes on GitHub
            <ExternalLinkIcon className="size-3" />
          </ExternalLink>
        </Button>
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const releasesQuery = useQuery(rpcClient.releases.list.queryOptions());
  const appVersionQuery = useQuery(
    rpcClient.preferences.getAppVersion.queryOptions(),
  );
  const preferencesQuery = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );

  const checkForUpdatesMutation = useMutation(
    rpcClient.preferences.checkForUpdates.mutationOptions(),
  );

  const handleCheckForUpdates = async () => {
    await checkForUpdatesMutation.mutateAsync({});
  };

  const releases = releasesQuery.data?.releases ?? [];
  const hasMoreReleases = releasesQuery.data?.hasMore ?? false;
  const currentVersion = appVersionQuery.data?.version;

  const lastChecked = preferencesQuery.data?.lastUpdateCheck
    ? new Date(preferencesQuery.data.lastUpdateCheck)
    : null;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Release Notes</h1>
          <p className="mt-2 text-muted-foreground">
            Latest updates and changes to Quests
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            disabled={checkForUpdatesMutation.isPending}
            onClick={handleCheckForUpdates}
            variant="secondary"
          >
            {checkForUpdatesMutation.isPending
              ? "Checking..."
              : "Check for Updates"}
          </Button>
          {lastChecked && (
            <p className="text-xs text-muted-foreground/50">
              Checked {formatDistanceToNow(lastChecked, { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {releasesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : releasesQuery.isError ? (
          <ErrorFallback />
        ) : releases.length === 0 ? (
          <ZeroState />
        ) : (
          releases.map((release) => (
            <Card className="overflow-hidden" key={release.id}>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {release.name || release.tag_name}
                        {currentVersion &&
                          (release.tag_name === currentVersion ||
                            release.tag_name === `v${currentVersion}`) && (
                            <Badge variant="outline">Your Version</Badge>
                          )}
                      </CardTitle>
                      <ExternalLink
                        className="inline-flex shrink-0 items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
                        href={release.html_url}
                      >
                        View on GitHub
                        <ExternalLinkIcon className="size-3" />
                      </ExternalLink>
                    </div>
                    {release.name && release.name !== release.tag_name ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Version {release.tag_name}</span>
                        <span>•</span>
                        <span>
                          {new Date(
                            release.published_at || release.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {new Date(
                          release.published_at || release.created_at,
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {release.body ? (
                  <div className="prose prose-sm dark:prose-invert">
                    <Markdown
                      allowRawHtml // To support GitHub's HTML-based image attachments
                      markdown={release.body}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    No release notes provided.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {!releasesQuery.isLoading &&
          !releasesQuery.isError &&
          releases.length > 0 &&
          hasMoreReleases && (
            <div className="pt-8 pb-4 text-center">
              <ExternalLink
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                href={RELEASE_NOTES_URL}
              >
                View older releases on GitHub
                <ExternalLinkIcon className="size-3" />
              </ExternalLink>
            </div>
          )}
      </div>
    </div>
  );
}

function ZeroState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">No releases found.</p>
      </CardContent>
    </Card>
  );
}
