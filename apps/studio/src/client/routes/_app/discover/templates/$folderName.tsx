/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import { TemplateDetail } from "@/client/components/template-detail";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_ICON_BACKGROUND, META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/templates/$folderName")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        rpcClient.workspace.registry.template.byFolderName.queryOptions({
          input: { folderName: params.folderName },
        }),
      );
    } catch {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw notFound();
    }
  },
  // eslint-disable-next-line perfectionist/sort-objects
  head: ({ loaderData, params }) => {
    return {
      meta: [
        {
          title: `${loaderData?.title ?? params.folderName} · Discover`,
        },
        {
          content: loaderData?.icon?.lucide,
          name: META_TAG_LUCIDE_ICON,
        },
        {
          content: loaderData?.icon?.background,
          name: META_TAG_ICON_BACKGROUND,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { folderName } = Route.useParams();
  const appDetails = Route.useLoaderData();

  return (
    <TemplateDetail
      breadcrumbItems={[
        { label: "Discover", to: "/discover" },
        { label: "Templates", to: "/discover/templates" },
        { label: appDetails.title },
      ]}
      folderName={folderName}
    />
  );
}
