import fs from "node:fs/promises";
import { z } from "zod";

import {
  DEFAULT_TEMPLATE_NAME,
  INSTALL_TIMEOUT_MS,
  REGISTRY_TEMPLATES_FOLDER,
} from "../../constants";
import { absolutePathJoin } from "../../lib/absolute-path-join";
import { templateExists } from "../../lib/app-dir-utils";
import { cancelableTimeout } from "../../lib/cancelable-timeout";
import {
  getRegistryAppDetails,
  RegistryAppDetailsSchema,
} from "../../lib/get-registry-app-details";
import {
  getRegistryApps,
  RegistryAppSchema,
} from "../../lib/get-registry-apps";
import { base } from "../base";

const byFolderName = base
  .input(z.object({ folderName: z.string() }))
  .output(RegistryAppDetailsSchema)
  .handler(async ({ context, errors, input }) => {
    const result = await getRegistryAppDetails(
      input.folderName,
      context.workspaceConfig,
    );
    if (!result) {
      throw errors.NOT_FOUND({
        message: `Registry app ${input.folderName} not found`,
      });
    }

    return result;
  });

const list = base
  .output(z.array(RegistryAppSchema))
  .handler(async ({ context }) => {
    return getRegistryApps(context.workspaceConfig);
  });

const screenshot = base
  .input(z.object({ folderName: z.string() }))
  .output(z.string().nullable())
  .handler(async ({ context, input }) => {
    const appDetails = await getRegistryAppDetails(
      input.folderName,
      context.workspaceConfig,
    );

    if (!appDetails?.screenshotPath) {
      return null;
    }

    try {
      const fileBuffer = await fs.readFile(appDetails.screenshotPath);
      const base64 = fileBuffer.toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch {
      return null;
    }
  });

let HAS_INSTALLED_DEFAULT_TEMPLATE = false;

const installDependencies = base
  .input(z.object({ templateName: z.literal(DEFAULT_TEMPLATE_NAME) }))
  .handler(async ({ context, errors, input, signal }) => {
    const { templateName } = input;

    if (HAS_INSTALLED_DEFAULT_TEMPLATE) {
      return {
        message: `Dependencies already installed for template ${templateName}`,
        success: true,
      };
    }

    // Check if template exists
    const exists = await templateExists({
      folderName: templateName,
      workspaceConfig: context.workspaceConfig,
    });

    if (!exists) {
      throw errors.NOT_FOUND({
        message: `Template ${templateName} not found`,
      });
    }

    const templateDir = absolutePathJoin(
      context.workspaceConfig.registryDir,
      REGISTRY_TEMPLATES_FOLDER,
      templateName,
    );

    try {
      const installTimeout = cancelableTimeout(INSTALL_TIMEOUT_MS);
      installTimeout.start();
      const combinedSignal = signal
        ? AbortSignal.any([signal, installTimeout.controller.signal])
        : installTimeout.controller.signal;

      const result = await context.workspaceConfig.runShellCommand(
        "pnpm install",
        {
          cwd: templateDir,
          signal: combinedSignal,
        },
      );

      installTimeout.cancel();

      if (result.isErr()) {
        // Log error but don't expose to UI
        context.workspaceConfig.captureException(result.error);
        return;
      }

      const processResult = await result.value;

      if (processResult.exitCode !== 0) {
        const error = new Error(
          `pnpm install failed with exit code ${processResult.exitCode ?? "unknown"}: ${processResult.stderr}`,
        );
        context.workspaceConfig.captureException(error);
        return;
      }

      HAS_INSTALLED_DEFAULT_TEMPLATE = true;
      return;
    } catch (error) {
      // Log error but don't expose to UI
      context.workspaceConfig.captureException(
        error instanceof Error ? error : new Error(String(error)),
      );
      return;
    }
  });

export const registry = {
  app: {
    byFolderName,
    list,
    screenshot,
  },
  template: {
    installDependencies,
  },
};
