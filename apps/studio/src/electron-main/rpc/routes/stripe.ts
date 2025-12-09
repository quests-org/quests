import { client as apiClient } from "@/electron-main/api/client";
import { authenticated } from "@/electron-main/rpc/base";
import { z } from "zod";

const createCheckoutSession = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) => apiClient.stripe.createCheckoutSession(input));

const createPortalSession = authenticated.handler(async () =>
  apiClient.stripe.createPortalSession(),
);

const getInvoicePreview = authenticated
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) => apiClient.stripe.getInvoicePreview(input));

export const stripe = {
  createCheckoutSession,
  createPortalSession,
  getInvoicePreview,
};
