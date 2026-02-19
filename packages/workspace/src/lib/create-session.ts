import { StoreId } from "../schemas/store-id";
import { type AppConfig } from "./app-config/types";
import { generateSessionTitle } from "./generate-session-title";
import { Store } from "./store";

export async function createSession({
  appConfig,
  parentSessionId,
  sessionNamePrefix,
  signal,
}: {
  appConfig: AppConfig;
  parentSessionId?: StoreId.Session;
  sessionNamePrefix?: string;
  signal?: AbortSignal;
}) {
  const title = await generateSessionTitle({
    appConfig,
    sessionNamePrefix,
    signal,
  });
  const sessionId = StoreId.newSessionId();
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
