import { client as apiClient } from "@/electron-main/api/client";
import { hasToken, isNetworkConnectionError } from "@/electron-main/api/utils";
import { logger as baseLogger } from "@/electron-main/lib/electron-logger";
import { createError } from "@/electron-main/lib/errors";
import { base } from "@/electron-main/rpc/base";
import { safe } from "@orpc/server";
import { z } from "zod";

const logger = baseLogger.scope("rpc/stripe");

const createCheckoutSession = base
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) => {
    if (hasToken()) {
      const [error, data] = await safe(
        apiClient.stripe.createCheckoutSession(input),
      );

      if (isNetworkConnectionError(error)) {
        logger.error("Network error creating checkout session", {
          cause: error?.cause,
          error,
        });
        return {
          data: null,
          error: createError("SERVER_CONNECTION_ERROR"),
        };
      } else if (error) {
        logger.error("Error creating checkout session", { error });
        return {
          data: null,
          error: createError(
            "UNKNOWN_IPC_ERROR",
            "There was an error creating your checkout session.",
          ),
        };
      } else {
        return {
          data,
          error: null,
        };
      }
    }

    return {
      data: null,
      error: createError("NO_TOKEN"),
    };
  });

const createPortalSession = base.handler(async () => {
  if (hasToken()) {
    const [error, data] = await safe(apiClient.stripe.createPortalSession());

    if (isNetworkConnectionError(error)) {
      logger.error("Network error creating portal session", {
        cause: error?.cause,
        error,
      });
      return {
        data: null,
        error: createError("SERVER_CONNECTION_ERROR"),
      };
    } else if (error) {
      logger.error("Error creating portal session", { error });
      return {
        data: null,
        error: createError(
          "UNKNOWN_IPC_ERROR",
          "There was an error creating your portal session.",
        ),
      };
    } else {
      return {
        data,
        error: null,
      };
    }
  }

  return {
    data: null,
    error: createError("NO_TOKEN"),
  };
});

const getInvoicePreview = base
  .input(z.object({ priceId: z.string() }))
  .handler(async ({ input }) => {
    if (hasToken()) {
      const [error, data] = await safe(
        apiClient.stripe.getInvoicePreview(input),
      );

      if (isNetworkConnectionError(error)) {
        logger.error("Network error getting invoice preview", {
          cause: error?.cause,
          error,
        });
        return {
          data: null,
          error: createError("SERVER_CONNECTION_ERROR"),
        };
      } else if (error) {
        logger.error("Error getting upgrade preview", { error });
        return {
          data: null,
          error: createError(
            "UNKNOWN_IPC_ERROR",
            "There was an error getting your upgrade preview.",
          ),
        };
      } else {
        return {
          data,
          error: null,
        };
      }
    }

    return {
      data: null,
      error: createError("NO_TOKEN"),
    };
  });

export const stripe = {
  createCheckoutSession,
  createPortalSession,
  getInvoicePreview,
};
