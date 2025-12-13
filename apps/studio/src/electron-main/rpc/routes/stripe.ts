import { vanillaAPIRPCClient } from "@/electron-main/api/client";
import { authenticated } from "@/electron-main/rpc/base";
import { z } from "zod";

const createCheckoutSession = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) =>
    vanillaAPIRPCClient.stripe.createCheckoutSession(input),
  );

const createPortalSession = authenticated.handler(async () =>
  vanillaAPIRPCClient.stripe.createPortalSession(),
);

const getInvoicePreview = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) =>
    vanillaAPIRPCClient.stripe.getInvoicePreview(input),
  );

export const stripe = {
  createCheckoutSession,
  createPortalSession,
  getInvoicePreview,
};
