import { type LanguageModelV2 } from "@ai-sdk/provider";
import { type AIGatewayModelURI } from "@quests/ai-gateway";
import { ok } from "neverthrow";

import { type SessionMessage } from "../schemas/session/message";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { type Upload } from "../schemas/upload";
import { type AppConfig } from "./app-config/types";
import { setProjectState } from "./project-state-store";
import { writeUploadedFiles } from "./write-uploaded-files";

export async function newMessage({
  appConfig,
  files,
  model,
  modelURI,
  prompt,
  sessionId,
}: {
  appConfig: AppConfig;
  files?: Upload.Type[];
  model: LanguageModelV2;
  modelURI: AIGatewayModelURI.Type;
  prompt: string;
  sessionId: StoreId.Session;
}) {
  const messageId = StoreId.newMessageId();
  const createdAt = new Date();
  const parts: SessionMessagePart.Type[] = [];
  if (prompt.trim()) {
    parts.push({
      metadata: {
        createdAt,
        id: StoreId.newPartId(),
        messageId,
        sessionId,
      },
      text: prompt.trim(),
      type: "text",
    });
  }

  if (files && files.length > 0) {
    const uploadResult = await writeUploadedFiles({
      appDir: appConfig.appDir,
      files,
      messageId,
      sessionId,
    });

    if (uploadResult.isErr()) {
      return uploadResult;
    }

    parts.push(uploadResult.value.part);
  }

  const message: SessionMessage.UserWithParts = {
    id: messageId,
    metadata: { createdAt, sessionId },
    parts,
    role: "user",
  };

  await setProjectState(appConfig.appDir, { selectedModelURI: modelURI });

  appConfig.workspaceConfig.captureEvent("message.created", {
    files_count: files?.length ?? 0,
    modelId: model.modelId,
    providerId: model.provider,
  });

  return ok(message);
}
