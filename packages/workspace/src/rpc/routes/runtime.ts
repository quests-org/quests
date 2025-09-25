import { call, eventIterator } from "@orpc/server";
import { isEqual } from "radashi";
import { ulid } from "ulid";
import { z } from "zod";

import { createAppConfig } from "../../lib/app-config/create";
import { redactWorkspacePaths } from "../../lib/redact-workspace-paths";
import { RuntimeLogEntrySchema } from "../../machines/runtime";
import { AppSubdomainSchema } from "../../schemas/subdomains";
import { base } from "../base";
import { publisher } from "../publisher";

const restart = base
  .input(
    z.object({
      appSubdomain: AppSubdomainSchema,
    }),
  )
  .handler(({ context, input }) => {
    context.workspaceRef.send({
      type: "restartRuntime",
      value: {
        subdomain: input.appSubdomain,
      },
    });
  });

const clearLogs = base
  .input(
    z.object({
      appSubdomain: AppSubdomainSchema,
    }),
  )
  .handler(({ context, input }) => {
    const snapshot = context.workspaceRef.getSnapshot();
    const runtimeRef = snapshot.context.runtimeRefs.get(input.appSubdomain);

    if (runtimeRef) {
      runtimeRef.send({ type: "clearLogs" });
    }
  });

const RuntimeLogEntrySchemaWithTruncation = RuntimeLogEntrySchema.extend({
  type: z.enum(["error", "normal", "truncation"]),
});

const logList = base
  .input(
    z.object({
      limit: z.number().optional().default(1000),
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(RuntimeLogEntrySchemaWithTruncation.array())
  .handler(({ context, input }) => {
    const snapshot = context.workspaceRef.getSnapshot();
    const runtimeRef = snapshot.context.runtimeRefs.get(input.subdomain);

    if (!runtimeRef) {
      return [];
    }

    const runtimeSnapshot = runtimeRef.getSnapshot();
    const allLogs = runtimeSnapshot.context.logs;

    let logsToReturn;
    if (allLogs.length <= input.limit) {
      logsToReturn = allLogs;
    } else {
      const truncatedCount = allLogs.length - input.limit;
      const recentLogs = allLogs.slice(-input.limit);

      const truncationMessage = {
        createdAt: new Date(),
        id: ulid(),
        message: `... ${truncatedCount} earlier log entries truncated`,
        type: "truncation" as const,
      };

      logsToReturn = [truncationMessage, ...recentLogs];
    }

    const appConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: snapshot.context.config,
    });

    return logsToReturn.map((log) => ({
      ...log,
      message: redactWorkspacePaths(log.message, appConfig),
    }));
  });

const logLiveList = base
  .input(
    z.object({
      limit: z.number().optional().default(1000),
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(eventIterator(RuntimeLogEntrySchemaWithTruncation.array()))
  .handler(async function* ({ context, input, signal }) {
    let previousLogs = yield call(logList, input, { context, signal });

    for await (const payload of publisher.subscribe("runtime.log.updated", {
      signal,
    })) {
      if (payload.subdomain === input.subdomain) {
        const currentLogs = yield call(logList, input, { context, signal });

        if (!isEqual(currentLogs, previousLogs)) {
          previousLogs = currentLogs;
        }
      }
    }
  });

export const runtime = {
  clearLogs,
  log: {
    list: logList,
    live: {
      list: logLiveList,
    },
  },
  restart,
};
