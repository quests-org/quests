import { AgentPicker } from "@/client/components/agent-picker";
import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { FileIcon } from "@/client/components/file-icon";
import { ModelPicker } from "@/client/components/model-picker";
import { Button } from "@/client/components/ui/button";
import {
  TextareaContainer,
  TextareaInner,
} from "@/client/components/ui/textarea-container";
import { cn, isMacOS } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type AgentName } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { ArrowUp, Loader2, Paperclip, Square, Upload, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { hasAIProviderConfigAtom } from "../atoms/has-ai-provider-config";
import {
  promptValueAtomFamily,
  type PromptValueAtomKey,
} from "../atoms/prompt-value";
import { rpcClient } from "../rpc/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface UploadedFile {
  content: string;
  name: string;
  previewUrl?: string;
  size: number;
  type: string;
}

function isImageFile(type: string) {
  return type.startsWith("image/");
}

const AGENT_PLACEHOLDER_MAP: Record<AgentName, string> = {
  "app-builder": "Describe the app you want to create…",
  chat: "Start a conversation…",
};

interface PromptInputProps {
  agentName: AgentName;
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
  onAgentChange?: (agentName: AgentName) => void;
  onModelChange: (modelURI: AIGatewayModelURI.Type) => void;
  onStop?: () => void;
  onSubmit: (value: {
    agentName: AgentName;
    files?: UploadedFile[];
    modelURI: AIGatewayModelURI.Type;
    openInNewTab?: boolean;
    prompt: string;
  }) => void;
  placeholder?: string;
  showAgentPicker?: boolean;
  submitButtonContent?: React.ReactNode;
}

interface PromptInputRef {
  focus: () => void;
}

export const PromptInput = forwardRef<PromptInputRef, PromptInputProps>(
  (
    {
      agentName,
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
      onAgentChange,
      onModelChange,
      onStop,
      onSubmit,
      placeholder,
      showAgentPicker = false,
      submitButtonContent,
    },
    ref,
  ) => {
    const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const textareaRef = useRef<HTMLDivElement>(null);
    const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);
    const hasAIProvider = useAtomValue(hasAIProviderConfigAtom);
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
      if (hasAIProvider) {
        setShowAIProviderGuard(false);
      }
    }, [hasAIProvider]);

    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    useEffect(() => {
      if (autoFocus && textareaInnerRef.current) {
        textareaInnerRef.current.focus();
        adjustHeight();
      }
    }, [autoFocus, adjustHeight]);

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const items = [...e.dataTransfer.items];
      const files = e.dataTransfer.files;

      let hasFolders = false;
      for (const item of items) {
        if (item.webkitGetAsEntry()?.isDirectory) {
          hasFolders = true;
          break;
        }
      }

      if (hasFolders) {
        toast.error(
          "Folders cannot be uploaded. Please select individual files.",
        );
        return;
      }

      for (const file of files) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1] ?? "";
          setUploadedFiles((prev) => [
            ...prev,
            {
              content: base64,
              name: file.name,
              previewUrl: isImageFile(file.type) ? dataUrl : undefined,
              size: file.size,
              type: file.type,
            },
          ]);
        });
        reader.readAsDataURL(file);
      }
    };

    const removeUploadedFile = (index: number) => {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) {
        return;
      }

      for (const file of files) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1] ?? "";
          setUploadedFiles((prev) => [
            ...prev,
            {
              content: base64,
              name: file.name,
              previewUrl: isImageFile(file.type) ? dataUrl : undefined,
              size: file.size,
              type: file.type,
            },
          ]);
        });
        reader.readAsDataURL(file);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const validateSubmission = useCallback(() => {
      if (!hasAIProvider) {
        setShowAIProviderGuard(true);
        return false;
      }

      if (!value.trim() && uploadedFiles.length === 0) {
        return false;
      }

      if (!modelURI || !selectedModel) {
        toast.error("Select a model");
        return false;
      }

      if (!isSubmittable) {
        toast.error(
          "Agent is still running. Wait for it to finish or stop it.",
        );
        return false;
      }

      return true;
    }, [
      hasAIProvider,
      value,
      uploadedFiles.length,
      modelURI,
      selectedModel,
      isSubmittable,
      setShowAIProviderGuard,
    ]);

    const handleSubmit = useCallback(
      (openInNewTab = false) => {
        if (!validateSubmission() || !modelURI) {
          return;
        }

        onSubmit({
          agentName,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          modelURI,
          openInNewTab,
          prompt: value.trim(),
        });
        if (!(allowOpenInNewTab && openInNewTab)) {
          setValue("");
          setUploadedFiles([]);
          resetTextareaHeight();
        }
      },
      [
        agentName,
        allowOpenInNewTab,
        modelURI,
        onSubmit,
        resetTextareaHeight,
        setValue,
        uploadedFiles,
        validateSubmission,
        value,
      ],
    );

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

    const canSubmit =
      !disabled &&
      !isLoading &&
      (value.trim() || uploadedFiles.length > 0) &&
      modelURI &&
      selectedModel;

    return (
      <>
        <TextareaContainer
          className={cn("overflow-hidden relative", className)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={handleDrop}
          ref={textareaRef}
          style={{ maxHeight: `${autoResizeMaxHeight}px` }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
              <Upload className="size-8 text-primary" />
              <span className="text-sm font-medium text-primary">
                Drop files to add to the{" "}
                {agentName === "chat" ? "chat" : "project"}
              </span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap items-start gap-2 mb-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file, index) =>
                file.previewUrl ? (
                  <Tooltip key={`${file.name}-${index}`}>
                    <TooltipTrigger asChild>
                      <div className="relative group size-12 shrink-0">
                        <img
                          alt={file.name}
                          className="size-12 rounded-lg object-cover border border-border"
                          src={file.previewUrl}
                        />
                        <button
                          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                          onClick={() => {
                            removeUploadedFile(index);
                          }}
                          type="button"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{file.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip key={`${file.name}-${index}`}>
                    <TooltipTrigger asChild>
                      <div className="relative group flex items-center gap-1.5 h-12 px-2.5 rounded-lg bg-muted/50 border border-border max-w-[180px]">
                        <FileIcon
                          className="size-5 shrink-0 text-muted-foreground"
                          filename={file.name}
                        />
                        <span className="text-xs leading-tight line-clamp-2 break-all">
                          {file.name}
                        </span>
                        <button
                          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                          onClick={() => {
                            removeUploadedFile(index);
                          }}
                          type="button"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{file.name}</p>
                    </TooltipContent>
                  </Tooltip>
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
            placeholder={placeholder ?? AGENT_PLACEHOLDER_MAP[agentName]}
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

          <div className="flex items-center gap-2 justify-end pt-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {showAgentPicker && (
                <AgentPicker
                  disabled={disabled}
                  onChange={onAgentChange}
                  value={agentName}
                />
              )}
              <div className="flex-1 min-w-0">
                <ModelPicker
                  disabled={disabled}
                  errors={modelsErrors}
                  isError={modelsIsError}
                  isLoading={modelsIsLoading}
                  models={models}
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
                  <Loader2 className="size-6 stroke-2 animate-spin" />
                  <Square className="size-2 fill-current absolute inset-0 m-auto" />
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
          description="You need to add an AI provider to submit prompts."
          onOpenChange={setShowAIProviderGuard}
          open={showAIProviderGuard}
        />
      </>
    );
  },
);

PromptInput.displayName = "PromptInput";
