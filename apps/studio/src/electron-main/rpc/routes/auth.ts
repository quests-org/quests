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

export const auth = {
  signInSocial,
  signOut,
};
