import { oc } from "@orpc/contract";
import { z } from "zod";

const base = oc.errors({
  BAD_REQUEST: {},
  FORBIDDEN: {},
  INTERNAL_SERVER_ERROR: {},
  UNAUTHORIZED: {},
});

export const contract = {
  plans: {
    get: base.input(z.void()).output(
      z.array(
        z.object({
          description: z.string(),
          features: z.array(z.object({ text: z.string() })),
          monthlyPrice: z.number(),
          name: z.string(),
          priceIds: z.object({
            monthly: z.string().nullable(),
            yearly: z.string().nullable(),
          }),
          yearlyPrice: z.number(),
        }),
      ),
    ),
  },
  root: {
    ping: base.input(z.void()).output(z.string()),
  },
  stripe: {
    createCheckoutSession: base
      .input(z.object({ priceId: z.string() }))
      .output(z.object({ url: z.string().nullable() })),
    createPortalSession: base
      .input(z.void())
      .output(z.object({ url: z.string() })),
    getInvoicePreview: base.input(z.object({ priceId: z.string() })).output(
      z.object({
        amountDue: z.number(),
        currency: z.string(),
        endingBalance: z.number(),
        prorationDate: z.number(),
        subtotal: z.number(),
      }),
    ),
  },
  users: {
    getMe: base.input(z.void()).output(
      z.object({
        createdAt: z.date(),
        email: z.string(),
        id: z.string(),
        image: z.string().nullable().optional(),
        name: z.string(),
        updatedAt: z.date(),
      }),
    ),
    getSubscriptionStatus: base.input(z.void()).output(
      z.object({
        billingCycle: z.enum(["monthly", "yearly"]).nullable(),
        freeUsagePercent: z.number(),
        hasEnoughCredits: z.boolean(),
        nextAllocation: z.date().nullable(),
        plan: z.string().nullable(),
        usagePercent: z.number(),
      }),
    ),
  },
};
