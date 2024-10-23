import { APPS_SERVER_API_PATH } from "@quests/shared";
import { parseEnvelope, type Event as SentryEvent } from "@sentry/core";
import { Hono } from "hono";

import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

const app = new Hono<WorkspaceServerEnv>().basePath(APPS_SERVER_API_PATH);

app.post("/envelope", async (c) => {
  const uriDetails = uriDetailsForHost(c.req.header("host") || "");

  if (uriDetails.isErr()) {
    // eslint-disable-next-line no-console
    console.error("Invalid host", c.req.header("host"));
    return c.json({ ok: false }, 400);
  }

  const { subdomain } = uriDetails.value;

  const body = await c.req.arrayBuffer();
  const envelope = parseEnvelope(new Uint8Array(body));
  const tuple = envelope[1][0];
  if (tuple[0].type === "event" && typeof tuple[1] === "object") {
    const event = tuple[1] as SentryEvent;
    c.var.parentRef.send({
      type: "workspaceServer.appEvent",
      value: {
        sentryEvent: event,
        subdomain,
      },
    });
  }
  return c.json({ ok: true }, 200);
});

export const envelopeRoute = app;
