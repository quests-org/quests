import { type StoreId } from "../schemas/store-id";
import { type AppConfig } from "./app-config/types";
import { generateSessionTitle } from "./generate-session-title";
import { Store } from "./store";

export async function createSession({
  appConfig,
  parentSessionId,
  sessionId,
  sessionNamePrefix,
  signal,
}: {
  appConfig: AppConfig;
  parentSessionId?: StoreId.Session;
  sessionId: StoreId.Session;
  sessionNamePrefix?: string;
  signal?: AbortSignal;
}) {
  const title = await generateSessionTitle({
    appConfig,
    sessionNamePrefix,
    signal,
  });
  const result = await Store.saveSession(
    {
      ...(parentSessionId ? { parentId: parentSessionId } : {}),
      createdAt: new Date(),
      id: sessionId,
      title,
    },
    appConfig,
    { signal },
  );

  if (result.isOk()) {
    appConfig.workspaceConfig.captureEvent("session.created");
  }

  return result;
}
