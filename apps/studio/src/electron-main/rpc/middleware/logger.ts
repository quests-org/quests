import { logger as baseLogger } from "@/electron-main/lib/electron-logger";
import { os } from "@orpc/server";

const logger = baseLogger.scope("rpc:call");

export const debugLoggerMiddleware = os
  .$context<{ webContentsId?: number }>()
  .middleware(async ({ context, next, path }) => {
    logger.info(path.join("/"), {
      webContentsId: context.webContentsId,
    });

    return next();
  });
