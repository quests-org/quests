import { type SessionMessage } from "@quests/workspace/client";

import { getRegisteredSessions } from "./helpers";

import.meta.glob("./data/*.ts", { eager: true });

interface PresetSession {
  id: string;
  messages: SessionMessage.WithParts[];
  name: string;
}

export const presetSessions: PresetSession[] = getRegisteredSessions().map(
  (session, index) => ({
    ...session,
    id: index.toString(),
  }),
);
