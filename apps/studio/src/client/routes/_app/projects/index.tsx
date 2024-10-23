import { ProjectList } from "@/client/components/project-list";
import { Button } from "@/client/components/ui/button";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsRouteComponent,
  head: () => ({
    meta: [
      {
        title: "Projects",
      },
      {
        content: "folder",
        name: META_TAG_LUCIDE_ICON,
      },
    ],
  }),
});

function ProjectsRouteComponent() {
  const router = useRouter();

  return (
    <div className="w-full flex-1 p-8">
      <div className="fixed top-4 left-4 z-50">
        <Button
          asChild
          onClick={() => {
            router.history.back();
          }}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-16">
        <ProjectList headerTitle="Your Projects" />
      </div>
    </div>
  );
}
