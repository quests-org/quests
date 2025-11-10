import type {
  ProjectSubdomain,
  WorkspaceAppProject,
} from "@quests/workspace/client";
import type { ColumnDef } from "@tanstack/react-table";

import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { InternalLink } from "@/client/components/internal-link";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowUpDown } from "lucide-react";

import { ProjectActionsCell } from "./actions";
import { ModelPreview } from "./model-preview";
import { SessionStatusPreview } from "./session-status-preview";

export function createColumns({
  onDelete,
  onOpenInNewTab,
  onStop,
}: {
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onStop: (subdomain: ProjectSubdomain) => void;
}): ColumnDef<WorkspaceAppProject>[] {
  return [
    {
      accessorKey: "select",
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
        />
      ),
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
          }}
        />
      ),
      id: "select",
      size: 40,
    },
    {
      accessorKey: "title",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <InternalLink
            className="flex items-center gap-x-2 min-w-0"
            openInCurrentTab
            params={{ subdomain: project.subdomain }}
            to="/projects/$subdomain"
          >
            {project.icon && (
              <SmallAppIcon
                background={project.icon.background}
                icon={project.icon.lucide}
                size="sm"
              />
            )}
            <span className="font-medium truncate">{project.title}</span>
            <AppStatusIcon
              className="h-4 w-4 shrink-0"
              subdomain={project.subdomain}
            />
          </InternalLink>
        );
      },
      header: ({ column }) => {
        return (
          <Button
            className="-ml-3"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === "asc");
            }}
            variant="ghost"
          >
            Project
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      maxSize: 400,
      minSize: 200,
    },
    {
      accessorKey: "status",
      cell: ({ row }) => {
        const project = row.original;
        return <SessionStatusPreview subdomain={project.subdomain} />;
      },
      header: "Chat",
      maxSize: 150,
      minSize: 100,
    },
    {
      accessorKey: "model",
      cell: ({ row }) => {
        const project = row.original;
        return <ModelPreview subdomain={project.subdomain} />;
      },
      header: "Last model",
      minSize: 150,
    },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(project.updatedAt, {
              addSuffix: true,
            })
              .replace("less than ", "")
              .replace("about ", "")}
          </span>
        );
      },
      header: ({ column }) => {
        return (
          <Button
            className="-ml-3"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === "asc");
            }}
            variant="ghost"
          >
            Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      size: 130,
    },
    {
      accessorKey: "createdAt",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <span className="text-sm text-muted-foreground">
            {format(project.createdAt, "MMM d, yyyy")}
          </span>
        );
      },
      header: ({ column }) => {
        return (
          <Button
            className="-ml-3"
            onClick={() => {
              column.toggleSorting(column.getIsSorted() === "asc");
            }}
            variant="ghost"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      size: 130,
    },
    {
      cell: ({ row }) => {
        const project = row.original;
        return (
          <ProjectActionsCell
            onDelete={onDelete}
            onOpenInNewTab={onOpenInNewTab}
            onStop={onStop}
            subdomain={project.subdomain}
          />
        );
      },
      enableHiding: false,
      id: "actions",
      size: 100,
    },
  ];
}
