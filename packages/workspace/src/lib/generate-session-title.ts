import { type AppConfig } from "./app-config/types";
import { Store } from "./store";

const TITLE_PREFIX = "Chat";

export async function generateSessionTitle(
  appConfig: AppConfig,
  { signal }: { signal?: AbortSignal } = {},
): Promise<string> {
  const currentDate = new Date().toISOString().split("T")[0] ?? "";
  const baseTitle = `${currentDate} ${TITLE_PREFIX}`;

  // Get all existing sessions to check for conflicts
  const sessionsResult = await Store.getSessions(appConfig, {
    includeChildSessions: true,
    signal,
  });

  if (sessionsResult.isErr()) {
    // If we can't get existing sessions, just return the base title
    return baseTitle;
  }

  const existingSessions = sessionsResult.value;
  const existingTitles = new Set(
    existingSessions.map((session) => session.title),
  );

  // If base title doesn't conflict, use it
  if (!existingTitles.has(baseTitle)) {
    return baseTitle;
  }

  // Find the next available number
  let counter = 2;
  let candidateTitle = `${currentDate} ${TITLE_PREFIX} ${counter}`;

  while (existingTitles.has(candidateTitle)) {
    counter++;
    candidateTitle = `${currentDate} ${TITLE_PREFIX} ${counter}`;
  }

  return candidateTitle;
}
