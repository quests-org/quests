import { hasToken as hasTokenUtil } from "@/electron-main/api/utils";
import {
  signInSocial as signInSocialFn,
  signOut as signOutFn,
} from "@/electron-main/auth/client";
import { base } from "@/electron-main/rpc/base";
import { z } from "zod";

import { publisher } from "../publisher";

const signOut = base.handler(async () => {
  await signOutFn();
});

const live = {
  hasToken: base.handler(async function* ({ signal }) {
    yield hasTokenUtil();

    for await (const _ of publisher.subscribe(
      "session.apiBearerToken.updated",
      {
        signal,
      },
    )) {
      yield hasTokenUtil();
    }
  }),
};

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
  live,
  signInSocial,
  signOut,
};
