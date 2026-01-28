import {
  type DataUIPart,
  type FileUIPart,
  type ReasoningUIPart,
  type SourceDocumentUIPart,
  type SourceUrlUIPart,
  type StepStartUIPart,
  type TextUIPart,
  type ToolUIPart,
  type UIMessagePart,
} from "ai";

import { type AISDKTools } from "../../tools/all";
import { type StoreId } from "../store-id";
import { type SessionMessageDataPart } from "./message-data-part";
import { SessionMessageRelaxedPart } from "./message-relaxed-part";

interface BaseMetadata extends Record<string, unknown> {
  createdAt: Date;
  id: StoreId.Part;
  messageId: StoreId.Message;
  sessionId: StoreId.Session;
}

export namespace SessionMessagePart {
  export type DataPart = DataUIPart<SessionMessageDataPart.DataParts> & {
    metadata: BaseMetadata;
  };

  export type FilePart = FileUIPart & {
    metadata: BaseMetadata;
  };

  export type ReasoningPart = ReasoningUIPart & {
    metadata: ReasoningPartMetadata;
  };

  export type SourceDocumentPart = SourceDocumentUIPart & {
    metadata: BaseMetadata;
  };

  export type SourceUrlPart = SourceUrlUIPart & {
    metadata: BaseMetadata;
  };

  export type StepStartPart = StepStartUIPart & {
    metadata: StepStartPartMetadata;
  };

  export interface StepStartPartMetadata extends BaseMetadata {
    stepCount: number;
  }

  // Part types with strongly typed metadata
  export type TextPart = TextUIPart & {
    metadata: TextPartMetadata;
  };

  // Metadata types for each specific part type
  export interface TextPartMetadata extends BaseMetadata {
    endedAt?: Date;
  }

  export type ToolPart =
    | ToolPartInputAvailable
    | ToolPartInputStreaming
    | ToolPartOutputAvailable
    | ToolPartOutputError;

  export type ToolPartInputAvailable = ToolUIPart<AISDKTools> & {
    metadata: BaseMetadata;
    state: "input-available";
  };

  export type ToolPartInputStreaming = ToolUIPart<AISDKTools> & {
    metadata: BaseMetadata;
    state: "input-streaming";
  };

  export type ToolPartOutputAvailable = ToolUIPart<AISDKTools> & {
    metadata: ToolPartOutputAvailableMetadata;
    state: "output-available";
  };

  export interface ToolPartOutputAvailableMetadata extends BaseMetadata {
    endedAt: Date;
  }

  export type ToolPartOutputError = ToolUIPart<AISDKTools> & {
    metadata: ToolPartOutputErrorMetadata;
    state: "output-error";
  };

  export interface ToolPartOutputErrorMetadata extends BaseMetadata {
    endedAt: Date;
  }

  // Union of all part types
  export type Type =
    | DataPart
    | FilePart
    | ReasoningPart
    | SourceDocumentPart
    | SourceUrlPart
    | StepStartPart
    | TextPart
    | ToolPart;

  interface ReasoningPartMetadata extends BaseMetadata {
    endedAt?: Date;
  }

  // Coercion from relaxed schema to strongly typed parts
  export const CoercedSchema = SessionMessageRelaxedPart.Schema.transform(
    (data) => data as Type,
  );

  export function coerce(part: SessionMessageRelaxedPart.Type): Type {
    return CoercedSchema.parse(part);
  }

  export function toUIPart({
    metadata: _metadata,
    ...part
  }: Type): UIMessagePart<SessionMessageDataPart.DataParts, AISDKTools> {
    return {
      ...part,
    };
  }
}
