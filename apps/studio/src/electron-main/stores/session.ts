import { logger } from "@/electron-main/lib/electron-logger";
import { is } from "@electron-toolkit/utils";
import { safeStorage } from "electron";
import Store from "electron-store";
import { z } from "zod";

import { publisher } from "../rpc/publisher";

const SessionStateSchema = z.object({
  apiBearerToken: z.string().nullish(),
  inviteCode: z.string().nullish(),
  provider: z.enum(["google"]).nullish(),
  providerAccessToken: z.string().nullish(),
  providerIdToken: z.string().nullish(),
  providerRefreshToken: z.string().nullish(),
  providerScopes: z.array(z.string()).nullish(),
  providerTokenType: z.string().nullish(),
});

type SessionState = z.output<typeof SessionStateSchema>;

let SESSION_STORE: null | Store<SessionState> = null;

export const getSessionStore = (): Store<SessionState> => {
  if (SESSION_STORE === null) {
    SESSION_STORE = new Store<SessionState>({
      deserialize: (value) => {
        if (is.dev) {
          const parsed = SessionStateSchema.safeParse(JSON.parse(value));

          if (parsed.success) {
            return parsed.data;
          }

          logger.error("Failed to parse session state", parsed.error);

          return {};
        }

        if (!safeStorage.isEncryptionAvailable()) {
          logger.error("Encryption is not available");
          return {};
        }

        try {
          return JSON.parse(
            safeStorage.decryptString(Buffer.from(value, "base64")),
          ) as SessionState;
        } catch (error) {
          logger.error(error);
          return {};
        }
      },
      fileExtension: is.dev ? "json" : "json.enc",
      name: is.dev ? "session-dev" : "session",
      serialize: (value) => {
        if (is.dev) {
          return JSON.stringify(value);
        }

        if (!safeStorage.isEncryptionAvailable()) {
          logger.error("Encryption is not available");
          return "";
        }

        const json = JSON.stringify(value);
        return safeStorage.encryptString(json).toString("base64");
      },
    });

    SESSION_STORE.onDidChange("apiBearerToken", () => {
      publisher.publish("apiBearerToken.updated", null);
    });
  }

  return SESSION_STORE;
};
