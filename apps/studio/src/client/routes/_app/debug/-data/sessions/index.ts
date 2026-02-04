import { type SessionMessage } from "@quests/workspace/client";

import { errorApiSession } from "./error-api";
import { errorApiKeySession } from "./error-api-key";
import { errorConsecutiveSession } from "./error-consecutive";
import { errorInsufficientCreditsSession } from "./error-insufficient-credits";
import { errorModelNotAllowedSession } from "./error-model-not-allowed";
import { errorModelNotFoundSession } from "./error-model-not-found";
import { errorMultipleSession } from "./error-multiple";
import { errorNoImageModelSession } from "./error-no-image-model";
import { errorNoModelRequestedSession } from "./error-no-model-requested";
import { errorTimeoutSession } from "./error-timeout";
import { errorUnknownSession } from "./error-unknown";
import { expandableUserMessageSession } from "./expandable-user-message";
import { multiTurnSession } from "./multi-turn";
import { toolsInputAvailableSession } from "./tools-input-available";
import { toolsInputStreamingSession } from "./tools-input-streaming";
import { toolsInvalidSession } from "./tools-invalid";
import { toolsMultipleStreamingSession } from "./tools-multiple-streaming";
import { toolsOutputAvailableSession } from "./tools-output-available";
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
    messages: errorNoImageModelSession,
    name: "Error: No Image Model",
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
  {
    messages: toolsInputAvailableSession,
    name: "Tools: Input Available",
  },
  {
    messages: toolsInputStreamingSession,
    name: "Tools: Input Streaming",
  },
  {
    messages: toolsOutputAvailableSession,
    name: "Tools: Output Available",
  },
  {
    messages: toolsMultipleStreamingSession,
    name: "Tools: Multiple Streaming",
  },
];

export const presetSessions: PresetSession[] = presetSessionsData.map(
  (session, index) => ({
    ...session,
    id: index.toString(),
  }),
);
