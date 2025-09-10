import { AIProviderGuardDialog } from "@/client/components/ai-provider-guard-dialog";
import { ModelPicker } from "@/client/components/model-picker";
import { Button } from "@/client/components/ui/button";
import {
  TextareaContainer,
  TextareaInner,
} from "@/client/components/ui/textarea-container";
import { cn } from "@/client/lib/utils";
import { type AIGatewayModel } from "@quests/ai-gateway";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { ArrowUp, Circle, Loader2, Square } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { hasAIProviderAtom } from "../atoms/has-ai-provider";
import { rpcClient } from "../rpc/client";

interface PromptInputProps {
  autoFocus?: boolean;
  autoResizeMaxHeight?: number;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isStoppable?: boolean;
  isSubmittable?: boolean;
  modelURI?: AIGatewayModel.URI;
  onModelChange?: (modelURI: AIGatewayModel.URI) => void;
  onStop?: () => void;
  onSubmit: (value: { modelURI: AIGatewayModel.URI; prompt: string }) => void;
  placeholder?: string;
}

interface PromptInputRef {
  focus: () => void;
}

export const PromptInput = forwardRef<PromptInputRef, PromptInputProps>(
  (
    {
      autoFocus = false,
      autoResizeMaxHeight = 400,
      className,
      disabled = false,
      isLoading = false,
      isStoppable = false,
      isSubmittable = true,
      modelURI,
      onModelChange,
      onStop,
      onSubmit,
      placeholder = "Type a message",
    },
    ref,
  ) => {
    const [value, setValue] = useState("");
    const [showAIProviderGuard, setShowAIProviderGuard] = useState(false);
    const textareaRef = useRef<HTMLDivElement>(null);
    const textareaInnerRef = useRef<HTMLTextAreaElement>(null);
    const hasAIProvider = useAtomValue(hasAIProviderAtom);

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

    useEffect(() => {
      if (hasAIProvider) {
        setShowAIProviderGuard(false);
      }
    }, [hasAIProvider]);

    const resetTextareaHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    };

    const adjustHeight = () => {
      if (textareaRef.current) {
        resetTextareaHeight();
        const newHeight = Math.min(
          textareaRef.current.scrollHeight + 2,
          autoResizeMaxHeight,
        );
        textareaRef.current.style.height = `${newHeight}px`;
      }
    };

    const validateSubmission = () => {
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
    };

    const handleSubmit = () => {
      if (!validateSubmission() || !modelURI) {
        return;
      }

      onSubmit({ modelURI, prompt: value.trim() });
      setValue("");
      resetTextareaHeight();
    };

    const handleStop = () => {
      onStop?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
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
          className={cn("overflow-auto", className)}
          ref={textareaRef}
        >
          <TextareaInner
            autoFocus={autoFocus}
            className="min-h-12"
            disabled={disabled}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={textareaInnerRef}
            value={value}
          />

          <div className="flex items-center gap-2 justify-end pt-2">
            {onModelChange && (
              <div className="flex-1 min-w-0">
                <ModelPicker
                  disabled={disabled}
                  errors={modelsErrors}
                  isError={modelsIsError}
                  isLoading={modelsIsLoading}
                  models={models}
                  onValueChange={onModelChange}
                  value={modelURI}
                />
              </div>
            )}

            <Button
              className="h-7 w-7 p-0"
              disabled={isStoppable ? false : !canSubmit}
              onClick={isStoppable ? handleStop : handleSubmit}
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
                <ArrowUp className="size-4" />
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
