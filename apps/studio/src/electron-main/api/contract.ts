import { oc } from "@orpc/contract";
import { z } from "zod";

export const contract = {
  plans: {
    get: oc.input(z.void()).output(
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
    ping: oc.input(z.void()).output(z.string()),
  },
  stripe: {
    createCheckoutSession: oc
      .input(z.object({ priceId: z.string() }))
      .output(z.object({ url: z.string().nullable() })),
    createPortalSession: oc
      .input(z.void())
      .output(z.object({ url: z.string() })),
    getInvoicePreview: oc.input(z.object({ priceId: z.string() })).output(
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
