import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { ModelPicker } from "@/client/components/model-picker";
import { Button } from "@/client/components/ui/button";
import {
  TextareaContainer,
  TextareaInner,
} from "@/client/components/ui/textarea-container";
import { cn, isMacOS } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { ArrowUp, Circle, Loader2, Square } from "lucide-react";
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
      placeholder = "Type a message",
      submitButtonContent,
    },
    ref,
  ) => {
    const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
    const textareaRef = useRef<HTMLDivElement>(null);
    const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
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

    const validateSubmission = useCallback(() => {
      if (!hasAIProvider) {
        setShowAIProviderGuard(true);
        return false;
      }

      if (!value.trim()) {
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

        onSubmit({ modelURI, openInNewTab, prompt: value.trim() });
        if (!(allowOpenInNewTab && openInNewTab)) {
          setValue("");
          resetTextareaHeight();
        }
      },
      [
        allowOpenInNewTab,
        modelURI,
        onSubmit,
        resetTextareaHeight,
        setValue,
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
      !disabled && !isLoading && value.trim() && modelURI && selectedModel;

    return (
      <>
        <TextareaContainer
          className={cn("overflow-hidden", className)}
          ref={textareaRef}
          style={{ maxHeight: `${autoResizeMaxHeight}px` }}
        >
          <TextareaInner
            autoFocus={autoFocus}
            className="min-h-12 overflow-y-auto"
            disabled={disabled}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={textareaInnerRef}
            value={value}
          />

          <div className="flex items-center gap-2 justify-end pt-2">
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
                  <Circle className="size-6 stroke-2 animate-spin" />
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
