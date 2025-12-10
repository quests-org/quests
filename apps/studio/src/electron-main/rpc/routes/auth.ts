import { hasToken as hasTokenUtil } from "@/electron-main/api/utils";
import {
  signInSocial as signInSocialFn,
  signOut as signOutFn,
} from "@/electron-main/auth/client";
import { base } from "@/electron-main/rpc/base";
import { z } from "zod";

const signOut = base.handler(async ({ context }) => {
  await signOutFn();
  context.tabsManager?.closeAllTabsByPathname("/subscribe");
});

const hasToken = base.handler(() => {
  return hasTokenUtil();
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
  hasToken,
  signInSocial,
  signOut,
};
