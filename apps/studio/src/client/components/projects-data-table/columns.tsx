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
import { ArrowUpDown, Star } from "lucide-react";

import { ProjectActionsCell } from "./actions";
import { ModelPreview } from "./model-preview";
import { SessionStatusPreview } from "./session-status-preview";

export function createColumns({
  favoriteProjectSubdomains,
  onDelete,
  onOpenInNewTab,
  onSettings,
  onStop,
}: {
  favoriteProjectSubdomains: Set<string>;
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onSettings: (subdomain: ProjectSubdomain) => void;
  onStop: (subdomain: ProjectSubdomain) => void;
}): ColumnDef<WorkspaceAppProject>[] {
  return [
    {
      accessorKey: "select",
      cell: ({ row }) => (
        // Make checkboxes more clickable with a before pseudo-element
        <label
          className="relative flex items-center justify-center before:absolute before:inset-0 before:-m-2 before:content-['']"
          onClick={(e) => {
            e.preventDefault();
            row.toggleSelected(!row.getIsSelected());
          }}
        >
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            className="pointer-events-none"
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
          />
        </label>
      ),
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        // Make checkboxes more clickable with a before pseudo-element
        <label
          className="relative flex items-center justify-center before:absolute before:inset-0 before:-m-2 before:content-['']"
          onClick={(e) => {
            e.preventDefault();
            table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());
          }}
        >
          <Checkbox
            aria-label="Select all"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            className="pointer-events-none"
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
            }}
          />
        </label>
      ),
      id: "select",
      size: 40,
    },
    {
      accessorKey: "title",
      cell: ({ row }) => {
        const project = row.original;
        const isFavorite = favoriteProjectSubdomains.has(project.subdomain);
        return (
          <div className="flex min-w-0 items-center gap-x-2">
            {isFavorite && (
              <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
            )}
            <InternalLink
              className="flex min-w-0 flex-1 items-center gap-x-2"
              openInCurrentTab
              params={{ subdomain: project.subdomain }}
              to="/projects/$subdomain"
            >
              <SmallAppIcon
                background={project.icon?.background}
                icon={project.icon?.lucide}
                mode={project.mode}
                size="sm"
              />
              <span className="truncate font-medium">{project.title}</span>
              <AppStatusIcon
                className="ml-auto h-4 w-4 shrink-0"
                subdomain={project.subdomain}
              />
            </InternalLink>
          </div>
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
      accessorKey: "model",
      cell: ({ row }) => {
        const project = row.original;
        return <ModelPreview subdomain={project.subdomain} />;
      },
      header: "Model",
      minSize: 150,
    },
    {
      accessorKey: "chatPreview",
      cell: ({ row }) => {
        const project = row.original;
        return <SessionStatusPreview subdomain={project.subdomain} />;
      },
      header: "Chat preview",
      maxSize: 150,
      minSize: 100,
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
            onSettings={onSettings}
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
