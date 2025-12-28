import { AppIcon } from "@/client/components/app-icon";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import {
  DEFAULT_THEME_GRADIENT,
  type IconName,
  SELECTABLE_APP_ICONS,
  THEMES,
} from "@quests/shared/icons";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { IconMap } from "./app-icons";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ProjectSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: WorkspaceAppProject;
}

export function ProjectSettingsDialog({
  onOpenChange,
  open,
  project,
}: ProjectSettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <ProjectSettingsForm
          // Ensures the form is remounted when the project changes
          key={project.subdomain}
          onOpenChange={onOpenChange}
          project={project}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProjectSettingsForm({
  onOpenChange,
  project,
}: {
  onOpenChange: (open: boolean) => void;
  project: WorkspaceAppProject;
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const { isPending, mutateAsync: updateProject } = useMutation(
    rpcClient.workspace.project.update.mutationOptions(),
  );

  const serverTitle = project.title;
  const serverTheme = project.icon?.background;
  const serverIcon = project.icon?.lucide;

  const form = useForm({
    defaultValues: {
      icon: serverIcon ?? SELECTABLE_APP_ICONS[0],
      name: serverTitle,
      theme: serverTheme,
    },
    onSubmit: async ({ value }) => {
      await updateProject({
        icon:
          project.mode !== "chat" && value.theme
            ? {
                background: value.theme,
                lucide: value.icon,
              }
            : undefined,
        name: value.name,
        subdomain: project.subdomain,
      });
      onOpenChange(false);
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {project.mode === "chat" ? "Chat Settings" : "Project Settings"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Configure the settings for your{" "}
          {project.mode === "chat" ? "chat" : "project"}.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-4 pt-4 pb-8">
          <div className="flex items-center gap-6">
            <form.Subscribe
              selector={(state) => ({
                icon: state.values.icon,
                theme: state.values.theme,
              })}
            >
              {({ icon, theme }) => (
                <>
                  {project.mode !== "chat" && (
                    <div className="flex min-w-fit flex-col items-center gap-2 pt-2">
                      <AppIcon background={theme} icon={icon} />
                    </div>
                  )}
                </>
              )}
            </form.Subscribe>

            <div className="grid flex-1 gap-3">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    if (!value.trim()) {
                      return "Name is required.";
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
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                        }}
                        placeholder={
                          project.mode === "chat"
                            ? "Enter chat title..."
                            : "Enter project title..."
                        }
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {project.mode !== "chat" && (
                <div className="grid grid-cols-2 gap-3">
                  <form.Field name="icon">
                    {(field) => {
                      const IconComponent =
                        IconMap[field.state.value as IconName];
                      return (
                        <FieldContent>
                          <FieldLabel htmlFor="icon">Icon</FieldLabel>
                          <Popover
                            onOpenChange={setIconPickerOpen}
                            open={iconPickerOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                aria-expanded={iconPickerOpen}
                                className="flex-1 justify-between"
                                disabled={isPending}
                                role="combobox"
                                type="button"
                                variant="outline"
                              >
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-80 p-0"
                              onWheel={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Command>
                                <div className="flex flex-1 items-center border-b">
                                  <CommandInput
                                    className="flex-1 border-0 outline-none focus:ring-0"
                                    containerClassName="border-0 flex-1"
                                    placeholder="Search icons..."
                                  />
                                </div>
                                <CommandList>
                                  <CommandEmpty>No icons found.</CommandEmpty>
                                  <CommandGroup>
                                    <div className="grid grid-cols-6 gap-2 p-2">
                                      {SELECTABLE_APP_ICONS.map(
                                        (iconOption) => {
                                          const IconOption =
                                            IconMap[iconOption];
                                          return (
                                            <CommandItem
                                              className={cn(
                                                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 p-0 transition-all hover:scale-105",
                                                field.state.value === iconOption
                                                  ? "border-foreground bg-accent ring-2 ring-ring"
                                                  : "border-muted hover:border-foreground",
                                              )}
                                              key={iconOption}
                                              onSelect={() => {
                                                field.handleChange(iconOption);
                                                setIconPickerOpen(false);
                                              }}
                                              value={iconOption}
                                            >
                                              <IconOption className="h-5 w-5" />
                                            </CommandItem>
                                          );
                                        },
                                      )}
                                    </div>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FieldContent>
                      );
                    }}
                  </form.Field>

                  <form.Field name="theme">
                    {(field) => {
                      return (
                        <FieldContent>
                          <FieldLabel htmlFor="color">Color</FieldLabel>
                          <Popover
                            onOpenChange={setColorPickerOpen}
                            open={colorPickerOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                aria-expanded={colorPickerOpen}
                                className="justify-between"
                                disabled={isPending}
                                role="combobox"
                                type="button"
                                variant="outline"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-4 w-4 rounded-full"
                                    style={{
                                      background:
                                        field.state.value ??
                                        DEFAULT_THEME_GRADIENT,
                                    }}
                                  />
                                </div>
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-fit p-3">
                              <div className="grid grid-cols-4 gap-2">
                                {THEMES.map((themeOption) => (
                                  <button
                                    className={cn(
                                      "h-8 w-8 rounded-lg border-2 transition-all hover:scale-105",
                                      field.state.value === themeOption
                                        ? "border-foreground ring-2 ring-ring"
                                        : "border-muted hover:border-foreground",
                                    )}
                                    key={themeOption}
                                    onClick={() => {
                                      field.handleChange(themeOption);
                                      setColorPickerOpen(false);
                                    }}
                                    style={{
                                      background: themeOption,
                                    }}
                                    type="button"
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </FieldContent>
                      );
                    }}
                  </form.Field>
                </div>
              )}
            </div>
          </div>
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
                Save
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
}
