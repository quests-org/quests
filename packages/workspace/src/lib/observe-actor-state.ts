import { alphabetical, isEqual } from "radashi";
import { type ActorRefFrom } from "xstate";

import { type sessionMachine } from "../machines/session";
import { publisher } from "../rpc/publisher";
import { type StoreId } from "../schemas/store-id";
import { type AppSubdomain } from "../schemas/subdomains";

export function observeSessionActor({
  actor,
  sessionId,
  subdomain,
}: {
  actor: ActorRefFrom<typeof sessionMachine>;
  sessionId: StoreId.Session;
  subdomain: AppSubdomain;
}) {
  let previousTags: string[] = [];

  const subscription = actor.subscribe((snapshot) => {
    const currentTags = alphabetical([...snapshot.tags], (tag) => tag);

    if (!isEqual(currentTags, previousTags)) {
      publisher.publish("appState.session.tagsChanged", {
        sessionId,
        subdomain,
      });
      previousTags = currentTags;
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
