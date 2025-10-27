import { os } from "@orpc/server";

export const api = {
  invites: {
    validateBetaInvite: os
      .errors({
        CONFLICT: {
          message: "This invite code has already been used",
        },
        NOT_FOUND: {
          message: "Invalid invite code",
        },
      })
      .handler(() => {
        return {
          invitedEmail: "test@quests.dev",
          valid: false,
        };
      }),
  },
  users: {
    getMe: os.handler(() => {
      return {
        email: "mock@quests.dev",
        id: "1",
        image: Math.random() > 0.5 ? "https://quests.dev/icon.png" : undefined,
        name: "Mock User",
      };
    }),
    getMyCredits: os.handler(() => {
      return {
        credits: 0,
      };
    }),
  },
};
