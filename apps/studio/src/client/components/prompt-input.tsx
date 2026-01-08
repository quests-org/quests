import { openFilePreviewAtom } from "@/client/atoms/file-preview";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { ModelPicker } from "@/client/components/model-picker";
import { Button } from "@/client/components/ui/button";
import {
  TextareaContainer,
  TextareaInner,
} from "@/client/components/ui/textarea-container";
import { UploadedFilePreview } from "@/client/components/uploaded-file-preview";
import { useWindowFileDrop } from "@/client/lib/use-window-file-drop";
import { cn, isMacOS } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type Upload as UploadType } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import { ArrowUp, Loader2, Paperclip, Square, Upload } from "lucide-react";
import {
  forwardRef,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface UploadedFile {
  content: string;
  mimeType: string;
  name: string;
  size: number;
  url?: string;
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
    files?: UploadType.Type[];
    modelURI: AIGatewayModelURI.Type;
    openInNewTab?: boolean;
    prompt: string;
  }) => void;
  placeholder?: string;
  submitButtonContent?: React.ReactNode;
}

interface PromptInputRef {
  focus: () => void;
}

export const PromptInput = forwardRef<PromptInputRef, PromptInputProps>(
  (
    {
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
      submitButtonContent,
    },
    ref,
  ) => {
    const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const openFilePreview = useSetAtom(openFilePreviewAtom);
    const textareaRef = useRef<HTMLDivElement>(null);
    const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
          setUploadedFiles((prev) => [
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
      onFolderDropAttempt: () => {
        toast.error("Folders aren't supported", {
          description: "However, you can drop multiple files at once.",
        });
      },
    });

    const removeUploadedFile = (index: number) => {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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

    const canSubmit =
      !disabled &&
      !isLoading &&
      (value.trim() || uploadedFiles.length > 0) &&
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
        toast.error(
          "Agent is still running. Wait for it to finish or stop it.",
        );
        return false;
      }

      return true;
    };

    const handleSubmit = (openInNewTab = false) => {
      if (!validateSubmission() || !modelURI) {
        return;
      }

      const trimmedPrompt = value.trim();
      const prompt =
        !trimmedPrompt && uploadedFiles.length > 0
          ? `Review the uploaded ${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} to help with this request.`
          : trimmedPrompt;

      onSubmit({
        files:
          uploadedFiles.length > 0
            ? uploadedFiles.map((f) => ({
                content: f.content,
                filename: f.name,
              }))
            : undefined,
        modelURI,
        openInNewTab,
        prompt,
      });
      if (!(allowOpenInNewTab && openInNewTab)) {
        setValue("");
        setUploadedFiles([]);
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
          setUploadedFiles((prev) => [
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
          className={cn("relative overflow-hidden", className)}
          ref={textareaRef}
          style={{ maxHeight: `${autoResizeMaxHeight}px` }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
              <Upload className="size-8 text-primary" />
              <span className="text-sm font-medium text-primary">
                Drop files to add to the project
              </span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="-m-2 mb-2 flex max-h-32 flex-wrap items-start gap-2 overflow-y-auto p-2">
              {uploadedFiles.map((file, index) => (
                <UploadedFilePreview
                  filename={file.name}
                  key={`${file.name}-${index}`}
                  mimeType={file.mimeType}
                  onClick={() => {
                    if (file.url) {
                      openFilePreview({
                        mimeType: file.mimeType,
                        name: file.name,
                        size: file.size,
                        url: file.url,
                      });
                    }
                  }}
                  onRemove={() => {
                    removeUploadedFile(index);
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <ModelPicker
                  disabled={disabled}
                  errors={modelsErrors}
                  isError={modelsIsError}
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-7 w-7 p-0"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  variant="ghost"
                >
                  <Paperclip className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload files</TooltipContent>
            </Tooltip>

            <Button
              className={cn(submitButtonContent ? "h-7 px-3" : "h-7 w-7 p-0")}
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
  },
);

PromptInput.displayName = "PromptInput";
