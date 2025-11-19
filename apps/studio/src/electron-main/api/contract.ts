import { oc } from "@orpc/contract";
import z from "zod";

export const contract = {
  invites: {
    validateBetaInvite: oc
      .input(z.object({ code: z.string() }))
      .output(
        z.object({
          invitedEmail: z.string(),
          valid: z.boolean(),
        }),
      )
      .errors({
        CONFLICT: {
          message: "This invite code has already been used",
        },
        NOT_FOUND: {
          message: "Invalid invite code",
        },
      }),
  },
  root: {
    ping: oc.input(z.void()).output(z.string()),
  },
  users: {
    getMe: oc.input(z.void()).output(
      z.object({
        createdAt: z.date(),
        email: z.string(),
        id: z.string(),
        image: z.string().nullable().optional(),
        name: z.string(),
        updatedAt: z.date(),
      }),
    ),
    getMyCredits: oc.input(z.void()).output(
      z.object({
        credits: z.number(),
      }),
    ),
    getSubscriptionStatus: oc.input(z.void()).output(
      z.object({
        billingCycle: z.enum(["monthly", "yearly"]).nullable(),
        freeUsagePercent: z.number(),
        nextAllocation: z.date().nullable(),
        plan: z.string().nullable(),
        usagePercent: z.number(),
      }),
    ),
  },
};
