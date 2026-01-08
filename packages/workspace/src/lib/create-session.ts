import { StoreId } from "../schemas/store-id";
import { type AppConfig } from "./app-config/types";
import { generateSessionTitle } from "./generate-session-title";
import { Store } from "./store";

export async function createSession({
  appConfig,
  sessionId,
  signal,
}: {
  appConfig: AppConfig;
  sessionId?: StoreId.Session;
  signal?: AbortSignal;
}) {
  const title = await generateSessionTitle(appConfig, { signal });
  const finalSessionId = sessionId ?? StoreId.newSessionId();
  const result = await Store.saveSession(
    {
      createdAt: new Date(),
      id: finalSessionId,
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
