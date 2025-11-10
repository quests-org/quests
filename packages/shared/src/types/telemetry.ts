import { type AIProviderType } from "../schemas/ai-gateway";

export interface AnalyticsEvents {
  // Using snake_case for property names because they show with spaces in the UI
  // Using [noun].[past-tense-verb] for event names as is industry standard
  "app.manual_check_for_updates": never;
  "app.opened_in": {
    app_id: string;
  };
  "app.quit": never;
  "app.ready": {
    graceful_exit: boolean;
  };
  "app.sidebar_closed": never;
  "app.sidebar_opened": never;
  "eval.created": {
    eval_names: string[];
    model_ids: string[];
  };
  "favorite.added": never;
  "favorite.removed": never;
  "framework.not_supported": {
    framework: string;
  };
  "llm.error": WithModelProperties<LLMAnalyticsError>;
  "llm.request_finished": WithModelProperties<{
    cached_input_tokens?: number | undefined;
    completion_tokens_per_second?: number | undefined;
    finish_reason: string;
    input_tokens: number | undefined;
    ms_to_finish: number;
    ms_to_first_chunk: number;
    output_tokens: number | undefined;
    reasoning_tokens?: number | undefined;
    step_count: number;
    total_tokens: number | undefined;
  }>;
  "llm.tool_called": WithModelProperties<{ tool_name: string }>;
  "llm.tool_executed": { success: boolean; tool_name: string };
  "message.created": WithModelProperties<{ length: number }>;
  "project.bulk_deleted": {
    project_count: number;
  };
  "project.bulk_stopped": {
    project_count: number;
  };
  "project.created": WithModelProperties<{
    eval_name?: string;
    template_name: string;
  }>;
  "project.forked": never;
  "project.opened_in": {
    app_name: string;
  };
  "project.restored_version": never;
  "project.share.copied_screenshot": never;
  "project.share.opened": never;
  "project.share.saved_screenshot": never;
  "project.trashed": never;
  "project.updated": never;
  "provider.created": {
    provider_type: AIProviderType;
  };
  "provider.picker_opened": never;
  "provider.removed": {
    provider_type: AIProviderType;
  };
  "provider.selected": {
    provider_type: AIProviderType;
  };
  "provider.verification_failed": {
    provider_type: AIProviderType;
  };
  "session.created": never;
  "session.removed": never;
  "session.stopped": never;
  "workspace.non_default_port": {
    apps_server_port: number;
  };
}

export type CaptureEventFunction<E = AnalyticsEvents> = <T extends keyof E>(
  type: T,

  ...rest: [E[T]] extends [never] ? [] : [properties: E[T]]
) => void;

export type CaptureExceptionFunction = (
  error: unknown,
  // A grab bag for now, but could be per type in the future
  additionalProperties?: {
    apps_server_port?: number;
    existing_part_state?: string;
    machine_name?: string;
    machine_state?: string;
    scopes?: ExceptionScope[];
    tool_name?: string;
    unhandled_event?: string;
  },
) => void;

export type ExceptionScope =
  | "ai-gateway"
  | "llm-request"
  | "rpc"
  | "studio"
  | "workspace";

type LLMAnalyticsError =
  | {
      error_message: string;
      error_type: "tool-error";
      tool_name: string;
    }
  | {
      error_type: "aborted";
    }
  | {
      error_type: "api-call";
    }
  | {
      error_type: "api-key";
    }
  | {
      error_type: "invalid-tool-input";
    }
  | {
      error_type: "no-such-tool";
      tool_name: string;
    };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type WithModelProperties<T extends Record<string, unknown> = {}> = T & {
  modelId: string;
  providerId: string;
};
