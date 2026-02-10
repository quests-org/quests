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
import { folderNameFromPath } from "@/client/lib/path-utils";
import {
  type DroppedFolder,
  useWindowFileDrop,
} from "@/client/lib/use-window-file-drop";
import { cn, isMacOS } from "@/client/lib/utils";
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

import {
  promptValueAtomFamily,
  type PromptValueAtomKey,
} from "../atoms/prompt-value";
import { rpcClient } from "../rpc/client";

interface AttachedFile {
  content: string;
  mimeType: string;
  name: string;
  size: number;
  url?: string;
}

interface AttachedFolder {
  path: string;
}

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
    folders?: AttachedFolder[];
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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [attachedFolders, setAttachedFolders] = useState<AttachedFolder[]>([]);
  const openFilePreview = useSetAtom(openFilePreviewAtom);
  const textareaRef = useRef<HTMLDivElement>(null);
  const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useAtom(promptValueAtomFamily(atomKey));

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

  const selectedModel = models?.find((model) => model.uri === modelURI);
  const autoModel = models?.find((m) => m.providerId === QUESTS_AUTO_MODEL_ID);

  const isInvalidQuestsModel =
    selectedModel &&
    selectedModel.params.provider === "quests" &&
    selectedModel.providerId !== QUESTS_AUTO_MODEL_ID;

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
        setAttachedFiles((prev) => [
          ...prev,
          {
            content: base64,
            mimeType: file.type,
            name: file.name,
            size: file.size,
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
      setAttachedFolders((prev) => {
        const duplicates: string[] = [];
        const newFolders: AttachedFolder[] = [];

        for (const folder of folders) {
          if (prev.some((f) => f.path === folder.path)) {
            duplicates.push(folderNameFromPath(folder.path));
          } else {
            newFolders.push({ path: folder.path });
          }
        }

        if (duplicates.length > 0) {
          toast.info(
            `${duplicates.length === 1 ? "Folder" : "Folders"} already attached`,
            { description: duplicates.join(", ") },
          );
        }

        return newFolders.length > 0 ? [...prev, ...newFolders] : prev;
      });
    },
  });

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const firstFile = files[0];
    if (firstFile) {
      const path = window.api.getFilePath(firstFile);
      if (path) {
        const folderPath = path.slice(0, path.lastIndexOf("/"));
        setAttachedFolders((prev) => {
          if (prev.some((f) => f.path === folderPath)) {
            toast.info("Folder already attached", {
              description: folderNameFromPath(folderPath),
            });
            return prev;
          }
          return [...prev, { path: folderPath }];
        });
      }
    }

    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const canSubmit =
    !disabled &&
    !isLoading &&
    (value.trim() || attachedFiles.length > 0 || attachedFolders.length > 0) &&
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
      setAttachedFiles([]);
      setAttachedFolders([]);
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
        setAttachedFiles((prev) => [
          ...prev,
          {
            content: base64,
            mimeType: "text/plain",
            name: filename,
            size: blob.size,
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

        {(attachedFolders.length > 0 || attachedFiles.length > 0) && (
          <div className="-m-2 mb-2 flex max-h-32 flex-wrap items-start gap-2 overflow-y-auto p-2">
            {attachedFolders.map((folder, index) => (
              <AttachedFolderPreview
                folderPath={folder.path}
                key={`folder-${folder.path}-${index}`}
                onRemove={() => {
                  setAttachedFolders((prev) =>
                    prev.filter((_, i) => i !== index),
                  );
                }}
              />
            ))}
            {attachedFiles.map((file, index) => (
              <AttachedFilePreview
                filename={file.name}
                key={`file-${file.name}-${index}`}
                mimeType={file.mimeType}
                onClick={() => {
                  if (file.url) {
                    openFilePreview({
                      filename: file.name,
                      mimeType: file.mimeType,
                      size: file.size,
                      url: file.url,
                    });
                  }
                }}
                onRemove={() => {
                  removeAttachedFile(index);
                }}
                size={file.size}
                url={file.url}
              />
            ))}
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
          ref={textareaInnerRef}
          value={value}
        />

        <input
          className="hidden"
          multiple
          onChange={handleFileSelect}
          ref={fileInputRef}
          type="file"
        />
        <input
          className="hidden"
          onChange={handleFolderSelect}
          ref={folderInputRef}
          type="file"
          // @ts-expect-error - webkitdirectory is not in the JSX types
          webkitdirectory=""
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
              <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
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
