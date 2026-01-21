import { type SessionMessage } from "@quests/workspace/client";

import { errorApiSession } from "./error-api";
import { errorApiKeySession } from "./error-api-key";
import { errorConsecutiveSession } from "./error-consecutive";
import { errorInsufficientCreditsSession } from "./error-insufficient-credits";
import { errorModelNotAllowedSession } from "./error-model-not-allowed";
import { errorModelNotFoundSession } from "./error-model-not-found";
import { errorMultipleSession } from "./error-multiple";
import { errorNoModelRequestedSession } from "./error-no-model-requested";
import { errorTimeoutSession } from "./error-timeout";
import { errorUnknownSession } from "./error-unknown";
import { expandableUserMessageSession } from "./expandable-user-message";
import { multiTurnSession } from "./multi-turn";
import { toolsInvalidSession } from "./tools-invalid";
import { toolsValidSession } from "./tools-valid";

interface PresetSession {
  id: string;
  messages: SessionMessage.WithParts[];
  name: string;
}

const presetSessionsData: {
  messages: SessionMessage.WithParts[];
  name: string;
}[] = [
  {
    messages: errorApiSession,
    name: "Error: API Call",
  },
  {
    messages: errorApiKeySession,
    name: "Error: API Key",
  },
  {
    messages: errorTimeoutSession,
    name: "Error: Timeout",
  },
  {
    messages: errorUnknownSession,
    name: "Error: Unknown",
  },
  {
    messages: errorMultipleSession,
    name: "Error: Multiple Errors",
  },
  {
    messages: errorConsecutiveSession,
    name: "Error: Consecutive Errors",
  },
  {
    messages: errorInsufficientCreditsSession,
    name: "Error: Insufficient Credits",
  },
  {
    messages: errorModelNotAllowedSession,
    name: "Error: Model Not Allowed",
  },
  {
    messages: errorModelNotFoundSession,
    name: "Error: Model Not Found",
  },
  {
    messages: errorNoModelRequestedSession,
    name: "Error: No Model Requested",
  },
  {
    messages: toolsValidSession,
    name: "Tools: Valid",
  },
  {
    messages: toolsInvalidSession,
    name: "Tools: Invalid",
  },
  {
    messages: multiTurnSession,
    name: "Multi-turn Conversation",
  },
  {
    messages: expandableUserMessageSession,
    name: "Expandable User Message",
  },
];

export const presetSessions: PresetSession[] = presetSessionsData.map(
  (session, index) => ({
    ...session,
    id: index.toString(),
  }),
);
