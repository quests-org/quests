import type { AnyActorRef, AnyEventObject } from "xstate";

import { type CaptureExceptionFunction } from "@quests/shared";

export function logUnhandledEvent({
  captureException,
  event,
  self,
}: {
  captureException: CaptureExceptionFunction;
  event: AnyEventObject;
  self: AnyActorRef;
}) {
  if (event.type.startsWith("xstate.")) {
    return;
  }
  let name: string;
  if (typeof self.src === "string") {
    name = self.src;
  } else if (typeof self.src === "object" && "id" in self.src) {
    name = (self.src as { id: string }).id;
  } else {
    name = "";
  }

  const snapshot = self.getSnapshot() as { value: unknown };
  captureException(
    new Error(`Unhandled event '${event.type}' in state machine '${name}'`),
    {
      machine_name: name,
      machine_state: JSON.stringify(snapshot.value),
      scopes: ["workspace"],
      unhandled_event: event.type,
    },
  );
}
