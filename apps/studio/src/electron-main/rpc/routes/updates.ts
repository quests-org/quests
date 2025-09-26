import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

const live = {
  available: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("updates.available", {
      signal,
    })) {
      yield payload;
    }
  }),
  cancelled: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("updates.cancelled", {
      signal,
    })) {
      yield payload;
    }
  }),
  checkStarted: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe("updates.check-started", {
      signal,
    })) {
      yield {
        checkStarted: true,
      };
    }
  }),
  downloaded: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("updates.downloaded", {
      signal,
    })) {
      yield payload;
    }
  }),
  error: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("updates.error", {
      signal,
    })) {
      yield payload;
    }
  }),
  notAvailable: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("updates.not-available", {
      signal,
    })) {
      yield payload;
    }
  }),
  progress: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe(
      "updates.download-progress",
      {
        signal,
      },
    )) {
      yield payload;
    }
  }),
};

export const updates = {
  live,
};
