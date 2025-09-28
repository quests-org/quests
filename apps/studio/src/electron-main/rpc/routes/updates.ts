import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

const live = {
  status: base.handler(async function* ({ context, signal }) {
    yield context.appUpdater.status;

    for await (const payload of publisher.subscribe("updates.status", {
      signal,
    })) {
      yield payload.status;
    }
  }),
};

export const updates = {
  live,
};
