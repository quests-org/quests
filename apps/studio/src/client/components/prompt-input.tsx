import { openFilePreviewAtom } from "@/client/atoms/file-preview";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { AttachedFilePreview } from "@/client/components/attached-file-preview";
import { AttachedFolderPreview } from "@/client/components/attached-folder-preview";
import { ModelPicker } from "@/client/components/model-picker";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  TextareaContainer,
  TextareaInner,
} from "@/client/components/ui/textarea-container";
import { useHasPlan } from "@/client/hooks/use-has-plan";
import { folderNameFromPath } from "@/client/lib/path-utils";
import {
  type DroppedFolder,
  useWindowFileDrop,
} from "@/client/lib/use-window-file-drop";
import { cn, isMacOS } from "@/client/lib/utils";
import { safe } from "@orpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { QUESTS_AUTO_MODEL_ID } from "@quests/shared";
import { type FileUpload } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import {
  ArrowUp,
  File,
  Folder,
  Loader2,
  Paperclip,
  Square,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ulid } from "ulid";

import {
  promptInputRefAtom,
  promptValueAtomFamily,
  type PromptValueAtomKey,
} from "../atoms/prompt-value";
import { rpcClient } from "../rpc/client";

type AttachedItem =
  | {
      content: string;
      id: string;
      mimeType: string;
      name: string;
      size: number;
      type: "file";
      url?: string;
    }
  | {
      id: string;
      path: string;
      type: "folder";
    };

const MAX_PASTE_TEXT_LENGTH = 5000;
const MAX_FILE_PREVIEW_SIZE = 10 * 1024 * 1024;

interface PromptInputProps {
  allowOpenInNewTab?: boolean;
  atomKey: PromptValueAtomKey;
  autoFocus?: boolean;
  autoResizeMaxHeight?: number;
  className?: string;
  disabled?: boolean;
  isLoading: boolean;
  isStoppable?: boolean;
  isSubmittable?: boolean;
  modelURI?: AIGatewayModelURI.Type;
  onModelChange: (modelURI: AIGatewayModelURI.Type) => void;
  onStop?: () => void;
  onSubmit: (value: {
    files?: FileUpload.Type[];
    folders?: { path: string }[];
    modelURI: AIGatewayModelURI.Type;
    openInNewTab?: boolean;
    prompt: string;
  }) => void;
  placeholder?: string;
  ref?: React.Ref<PromptInputRef>;
  submitButtonContent?: React.ReactNode;
}

interface PromptInputRef {
  focus: () => void;
}

export const PromptInput = ({
  allowOpenInNewTab = false,
  atomKey,
  autoFocus = false,
  autoResizeMaxHeight = 400,
  className,
  disabled = false,
  isLoading,
  isStoppable = false,
  isSubmittable = true,
  modelURI,
  onModelChange,
  onStop,
  onSubmit,
  placeholder,
  ref,
  submitButtonContent,
}: PromptInputProps) => {
  const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
  const [attachedItems, setAttachedItems] = useState<AttachedItem[]>([]);
  const openFilePreview = useSetAtom(openFilePreviewAtom);
  const textareaRef = useRef<HTMLDivElement>(null);
  const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useAtom(promptValueAtomFamily(atomKey));
  const setInputRef = useSetAtom(promptInputRefAtom);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaInnerRef.current?.focus();
    },
  }));

  const {
    data: modelsData,
    isError: modelsIsError,
    isLoading: modelsIsLoading,
    refetch: modelsRefetch,
  } = useQuery(rpcClient.gateway.models.live.list.experimental_liveOptions());
  const { errors: modelsErrors, models } = modelsData ?? {};

  const hasPlan = useHasPlan();

  const selectedModel = models?.find((model) => model.uri === modelURI);
  const autoModel = models?.find((m) => m.providerId === QUESTS_AUTO_MODEL_ID);

  const isInvalidQuestsModel =
    !hasPlan &&
    selectedModel &&
    selectedModel.params.provider === "quests" &&
    selectedModel.providerId !== QUESTS_AUTO_MODEL_ID &&
    selectedModel.tags.includes("premium");

  const resetTextareaHeight = useCallback(() => {
    if (textareaInnerRef.current) {
      textareaInnerRef.current.style.height = "auto";
    }
  }, []);

  const adjustHeight = useCallback(() => {
    if (textareaInnerRef.current) {
      resetTextareaHeight();
      const newHeight = Math.min(
        textareaInnerRef.current.scrollHeight,
        autoResizeMaxHeight,
      );
      textareaInnerRef.current.style.height = `${newHeight}px`;
    }
  }, [autoResizeMaxHeight, resetTextareaHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    if (autoFocus && textareaInnerRef.current) {
      textareaInnerRef.current.focus();
      adjustHeight();
    }
  }, [autoFocus, adjustHeight]);

  const processFiles = (files: File[] | FileList) => {
    for (const file of files) {
      const shouldCreatePreview =
        file.size <= MAX_FILE_PREVIEW_SIZE && file.type.startsWith("image/");

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        setAttachedItems((prev) => [
          ...prev,
          {
            content: base64,
            id: ulid(),
            mimeType: file.type,
            name: file.name,
            size: file.size,
            type: "file" as const,
            url: shouldCreatePreview ? dataUrl : undefined,
          },
        ]);
      });
      reader.readAsDataURL(file);
    }
  };

  const { isDragging } = useWindowFileDrop({
    onFilesDropped: processFiles,
    onFoldersDropped: (folders: DroppedFolder[]) => {
      setAttachedItems((prev) => {
        const existingPaths = new Set(
          prev.filter((i) => i.type === "folder").map((i) => i.path),
        );
        const duplicates: string[] = [];
        const newFolders: AttachedItem[] = [];

        for (const folder of folders) {
          if (existingPaths.has(folder.path)) {
            duplicates.push(folderNameFromPath(folder.path));
          } else {
            newFolders.push({ id: ulid(), path: folder.path, type: "folder" });
          }
        }

        if (duplicates.length > 0) {
          const names = duplicates.join(", ");
          toast.info(
            duplicates.length === 1
              ? `"${names}" is already added`
              : `Some folders are already added`,
            {
              description:
                duplicates.length === 1
                  ? "That folder has already been attached. Each folder can only be added once."
                  : `${names} have already been attached. Each folder can only be added once.`,
            },
          );
        }

        return newFolders.length > 0 ? [...prev, ...newFolders] : prev;
      });
    },
  });

  const removeAttachedItem = (index: number) => {
    setAttachedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      return;
    }

    processFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFolderPick = async () => {
    const [error, result] = await safe(
      rpcClient.utils.showFolderPicker.call({}),
    );
    if (error) {
      toast.error("Failed to open folder picker");
      return;
    }
    if (!result) {
      return;
    }
    const folderPath = result.path;
    setAttachedItems((prev) => {
      if (prev.some((i) => i.type === "folder" && i.path === folderPath)) {
        toast.info(`"${folderNameFromPath(folderPath)}" is already added`, {
          description:
            "That folder has already been attached. Each folder can only be added once.",
        });
        return prev;
      }
      return [...prev, { id: ulid(), path: folderPath, type: "folder" }];
    });
  };

  const attachedFiles = attachedItems.filter((i) => i.type === "file");
  const attachedFolders = attachedItems.filter((i) => i.type === "folder");

  const canSubmit =
    !disabled &&
    !isLoading &&
    (value.trim() || attachedItems.length > 0) &&
    modelURI &&
    selectedModel;

  const validateSubmission = () => {
    if (!canSubmit) {
      if (!modelURI || !selectedModel) {
        toast.error("Select a model");
      }
      return false;
    }

    if (!isSubmittable) {
      toast.error("Agent is still running. Wait for it to finish or stop it.");
      return false;
    }

    if (isInvalidQuestsModel && autoModel) {
      toast.error("Invalid model selected", {
        action: {
          label: "Use Auto",
          onClick: () => {
            onModelChange(autoModel.uri);
          },
        },
        description: "Only the Auto model is available without a paid plan.",
        duration: 7000,
      });
      return false;
    }

    return true;
  };

  const handleSubmit = (openInNewTab = false) => {
    if (!validateSubmission() || !modelURI) {
      return;
    }

    const trimmedPrompt = value.trim();
    const hasAttachments =
      attachedFiles.length > 0 || attachedFolders.length > 0;
    const prompt =
      !trimmedPrompt && hasAttachments
        ? `Review the ${attachedFiles.length > 0 ? `${attachedFiles.length} added file${attachedFiles.length === 1 ? "" : "s"}` : ""}${attachedFiles.length > 0 && attachedFolders.length > 0 ? " and " : ""}${attachedFolders.length > 0 ? `${attachedFolders.length} attached folder${attachedFolders.length === 1 ? "" : "s"}` : ""} to help with this request.`
        : trimmedPrompt;

    onSubmit({
      files:
        attachedFiles.length > 0
          ? attachedFiles.map((f) => ({
              content: f.content,
              filename: f.name,
            }))
          : undefined,
      folders: attachedFolders.length > 0 ? attachedFolders : undefined,
      modelURI,
      openInNewTab,
      prompt,
    });
    if (!(allowOpenInNewTab && openInNewTab)) {
      setValue("");
      setAttachedItems([]);
      resetTextareaHeight();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const openInNewTab =
        allowOpenInNewTab && (isMacOS() ? e.metaKey : e.ctrlKey);
      handleSubmit(openInNewTab);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    adjustHeight();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    if (text && text.length > MAX_PASTE_TEXT_LENGTH) {
      e.preventDefault();

      const blob = new Blob([text], { type: "text/plain" });
      const timestamp = new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");
      const filename = `pasted-text-${timestamp}.txt`;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        setAttachedItems((prev) => [
          ...prev,
          {
            content: base64,
            id: ulid(),
            mimeType: "text/plain",
            name: filename,
            size: blob.size,
            type: "file" as const,
          },
        ]);
      });
      reader.readAsDataURL(blob);

      toast.info(
        `Large text (${text.length.toLocaleString()} characters) converted to file attachment`,
      );
    }
  };

  return (
    <>
      <TextareaContainer
        className={cn(
          "relative overflow-hidden",
          // Equivalent of transparent and dark:bg-input/30, but opaque
          "bg-background dark:bg-[#212226]",
          className,
        )}
        ref={textareaRef}
        style={{ maxHeight: `${autoResizeMaxHeight}px` }}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
            <Upload className="size-8 text-primary" />
            <span className="text-sm font-medium text-primary">
              Drop files or folders to add them
            </span>
          </div>
        )}

        {attachedItems.length > 0 && (
          <div className="-m-2 mb-2 flex max-h-32 flex-wrap items-start gap-2 overflow-y-auto p-2">
            {attachedItems.map((item, index) =>
              item.type === "folder" ? (
                <AttachedFolderPreview
                  folderPath={item.path}
                  key={item.id}
                  onRemove={() => {
                    removeAttachedItem(index);
                  }}
                />
              ) : (
                <AttachedFilePreview
                  filename={item.name}
                  key={item.id}
                  mimeType={item.mimeType}
                  onClick={() => {
                    if (item.url) {
                      openFilePreview({
                        filename: item.name,
                        mimeType: item.mimeType,
                        size: item.size,
                        url: item.url,
                      });
                    }
                  }}
                  onRemove={() => {
                    removeAttachedItem(index);
                  }}
                  size={item.size}
                  url={item.url}
                />
              ),
            )}
          </div>
        )}

        <TextareaInner
          autoFocus={autoFocus}
          className="min-h-12 overflow-y-auto"
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          ref={(el) => {
            textareaInnerRef.current = el;
            setInputRef(el);
          }}
          value={value}
        />

        <input
          className="hidden"
          multiple
          onChange={handleFileSelect}
          ref={fileInputRef}
          type="file"
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <ModelPicker
                disabled={disabled}
                errors={modelsErrors}
                isError={modelsIsError}
                isInvalidQuestsModel={!!isInvalidQuestsModel}
                isLoading={modelsIsLoading}
                models={models}
                onAddProvider={() => {
                  setShowAIProviderGuard(true);
                }}
                onOpenChange={(open) => {
                  if (open && modelsErrors && modelsErrors.length > 0) {
                    void modelsRefetch();
                  }
                }}
                onValueChange={onModelChange}
                selectedModel={selectedModel}
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-7 p-0"
                disabled={disabled}
                size="sm"
                variant="ghost"
              >
                <Paperclip className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <File />
                Add files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleFolderPick()}>
                <Folder />
                Add folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className={cn(submitButtonContent ? "h-7 px-3" : "size-7 p-0")}
            disabled={isStoppable ? false : !canSubmit}
            onClick={(e) => {
              if (isStoppable) {
                handleStop();
              } else {
                const openInNewTab =
                  allowOpenInNewTab && (isMacOS() ? e.metaKey : e.ctrlKey);
                handleSubmit(openInNewTab);
              }
            }}
            size="sm"
            variant={isStoppable ? "ghost" : "brand"}
          >
            {isStoppable ? (
              <div className="relative flex items-center justify-center">
                <Loader2 className="size-6 animate-spin stroke-2" />
                <Square className="absolute inset-0 m-auto size-2 fill-current" />
              </div>
            ) : isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              (submitButtonContent ?? <ArrowUp className="size-4" />)
            )}
          </Button>
        </div>
      </TextareaContainer>

      <AIProviderGuardDialog
        description="You need to add an AI provider to use Quests."
        onOpenChange={setShowAIProviderGuard}
        open={showAIProviderGuard}
      />
    </>
  );
};
