import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

export function ProjectSettingsDialog({
  onOpenChange,
  open,
  project,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: WorkspaceAppProject;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <RenameForm
          key={project.subdomain}
          onOpenChange={onOpenChange}
          project={project}
        />
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  onOpenChange,
  project,
}: {
  onOpenChange: (open: boolean) => void;
  project: WorkspaceAppProject;
}) {
  const { isPending, mutateAsync: updateProject } = useMutation(
    rpcClient.workspace.project.update.mutationOptions({
      onError: (error) => {
        toast.error("Failed to rename project", {
          description: error.message,
        });
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: project.title,
    },
    onSubmit: async ({ value }) => {
      await updateProject({
        name: value.name,
        subdomain: project.subdomain,
      });
      onOpenChange(false);
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename Project</DialogTitle>
        <DialogDescription className="sr-only">
          Rename your project
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-4 pt-4 pb-8">
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) {
                  return "Name is required.";
                }
                if (value.length > 1024) {
                  return "Name must be 1024 characters or less.";
                }
                return;
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    disabled={isPending}
                    id={field.name}
                    maxLength={1024}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    placeholder="Enter project title..."
                    value={field.state.value}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                disabled={!canSubmit || isSubmitting || isPending}
                type="submit"
              >
                Rename
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
