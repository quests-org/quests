import { apiRPCClient } from "@/electron-main/api/client";
import { authenticated } from "@/electron-main/rpc/base";
import { z } from "zod";

const createCheckoutSession = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) =>
    apiRPCClient.stripe.createCheckoutSession.call(input),
  );

const createPortalSession = authenticated.handler(async () =>
  apiRPCClient.stripe.createPortalSession.call(),
);

const getInvoicePreview = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) =>
    apiRPCClient.stripe.getInvoicePreview.call(input),
  );

export const stripe = {
  createCheckoutSession,
  createPortalSession,
  getInvoicePreview,
};
