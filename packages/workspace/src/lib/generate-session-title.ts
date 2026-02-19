import { type AppConfig } from "./app-config/types";
import { Store } from "./store";

const DEFAULT_TITLE_PREFIX = "Chat";

export async function generateSessionTitle({
  appConfig,
  sessionNamePrefix,
  signal,
}: {
  appConfig: AppConfig;
  sessionNamePrefix?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const currentDate = new Date().toISOString().split("T")[0] ?? "";
  const prefix = sessionNamePrefix ?? DEFAULT_TITLE_PREFIX;
  const baseTitle = `${currentDate} ${prefix}`;

  const sessionsResult = await Store.getSessions(appConfig, {
    includeChildSessions: true,
    signal,
  });

  if (sessionsResult.isErr()) {
    return baseTitle;
  }

  const existingSessions = sessionsResult.value;
  const existingTitles = new Set(
    existingSessions.map((session) => session.title),
  );

  if (!existingTitles.has(baseTitle)) {
    return baseTitle;
  }

  let counter = 2;
  let candidateTitle = `${currentDate} ${prefix} ${counter}`;

  while (existingTitles.has(candidateTitle)) {
    counter++;
    candidateTitle = `${currentDate} ${prefix} ${counter}`;
  }

  return candidateTitle;
}
