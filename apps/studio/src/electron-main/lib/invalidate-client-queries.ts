import { isEqual } from "radashi";

import { publisher } from "../rpc/publisher";
import { captureServerException } from "./capture-server-exception";

const SUBSCRIBERS = new Map<string, ClientInvalidationEventType[]>();

export type ClientInvalidationEventType =
  | "apiBearerToken.updated"
  | "subscription.updated"
  | "user.updated";

export function invalidateClientQueries(
  eventTypes: ClientInvalidationEventType[],
) {
  const rpcPaths = [...SUBSCRIBERS.entries()]
    .filter(([, subscribedEvents]) =>
      subscribedEvents.some((event) => eventTypes.includes(event)),
    )
    .map(([rpcPath]) => rpcPath);
  publisher.publish("rpc.invalidate", { rpcPaths });
}

export function registerProcedureForClientInvalidation({
  eventTypes,
  rpcPath,
}: {
  eventTypes: ClientInvalidationEventType[];
  rpcPath: string;
}) {
  const existing = SUBSCRIBERS.get(rpcPath);

  if (existing) {
    const isSame = isEqual(existing, eventTypes);
    if (!isSame) {
      captureServerException(
        new Error(
          `Cannot re-register RPC path "${rpcPath}" with different event types`,
        ),
        { scopes: ["api"] },
      );
    }
    return;
  }

  SUBSCRIBERS.set(rpcPath, eventTypes);
}

void publisher.subscribe("apiBearerToken.updated", () => {
  invalidateClientQueries(["apiBearerToken.updated"]);
});
