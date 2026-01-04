import type { AppSubdomain } from "@quests/workspace/client";

import { rpcClient } from "@/client/rpc/client";
import { fromCallback, setup } from "xstate";

interface AppCoverContext {
  subdomain: AppSubdomain;
}

type AppCoverEvent =
  | { type: "dismiss" }
  | { type: "sessionStarted" }
  | { type: "sessionStopped" };

export const appCoverMachine = setup({
  actors: {
    subscribeToAppState: fromCallback<
      AppCoverEvent,
      { subdomain: AppSubdomain }
    >(({ input, sendBack }) => {
      let isCancelled = false;

      async function subscribe() {
        const iterator =
          await rpcClient.workspace.app.state.live.bySubdomain.call({
            subdomain: input.subdomain,
          });

        for await (const appState of iterator) {
          if (isCancelled) {
            break;
          }

          const hasRunningSession = appState.sessionActors.some((session) =>
            session.tags.includes("agent.running"),
          );

          sendBack({
            type: hasRunningSession ? "sessionStarted" : "sessionStopped",
          });
        }
      }

      void subscribe();

      return () => {
        isCancelled = true;
      };
    }),
  },
  types: {
    context: {} as AppCoverContext,
    events: {} as AppCoverEvent,
    input: {} as { subdomain: AppSubdomain },
  },
}).createMachine({
  context: ({ input }: { input: { subdomain: AppSubdomain } }) => ({
    subdomain: input.subdomain,
  }),
  id: "appCover",
  initial: "Hidden",
  invoke: {
    input: ({ context }) => ({ subdomain: context.subdomain }),
    src: "subscribeToAppState",
  },
  states: {
    Dismissed: {
      on: {
        sessionStarted: {},
        sessionStopped: {},
      },
    },
    Hidden: {
      on: {
        sessionStarted: {
          target: "Visible",
        },
      },
    },
    Hiding: {
      after: {
        2000: {
          target: "Hidden",
        },
      },
      on: {
        dismiss: {
          target: "Dismissed",
        },
        sessionStarted: {
          target: "Visible",
        },
      },
    },
    Visible: {
      on: {
        dismiss: {
          target: "Dismissed",
        },
        sessionStopped: {
          target: "Hiding",
        },
      },
    },
  },
});
