import { client as apiClient } from "@/electron-main/api/client";
import { isNetworkConnectionError } from "@/electron-main/api/utils";
import {
  signInSocial as signInSocialFn,
  signOut as signOutFn,
} from "@/electron-main/auth/client";
import { logger } from "@/electron-main/lib/electron-logger";
import { createError } from "@/electron-main/lib/errors";
import { base } from "@/electron-main/rpc/base";
import { isDefinedError, safe } from "@orpc/server";
import { z } from "zod";

const signOut = base.handler(async () => {
  await signOutFn();
});

const signInSocial = base
  .input(
    z.object({
      inviteCode: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    return signInSocialFn(input.inviteCode);
  });

const validateBetaInvite = base
  .input(
    z.object({
      code: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    const [error, data] = await safe(
      apiClient.invites.validateBetaInvite({ code: input.code }),
    );

    if (isNetworkConnectionError(error)) {
      logger.error("Network error validating beta invite", {
        cause: error?.cause,
        error,
      });
      return {
        error: createError("SERVER_CONNECTION_ERROR"),
        valid: false,
      };
    } else if (isDefinedError(error)) {
      logger.error("Error validating invite", { error });
      if (error.code === "CONFLICT") {
        return {
          error: createError(
            "CONFLICT",
            "This invite code has already been used.",
          ),
          valid: false,
        };
      }

      return {
        error: createError(
          "NOT_FOUND",
          "This invite code is not valid. Please check your invite code and try again.",
        ),
        valid: false,
      };
    } else if (error) {
      logger.error("Unknown error validating invite", { error });
      return {
        error: createError(
          "UNKNOWN_IPC_ERROR",
          error.message || "There was an error validating your invite code",
        ),
        valid: false,
      };
    } else {
      return { ...data, valid: true };
    }
  });

export const auth = {
  signInSocial,
  signOut,
  validateBetaInvite,
};
