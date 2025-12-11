import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

export const cache = {
  live: {
    onRPCInvalidation: base.handler(async function* ({ signal }) {
      for await (const payload of publisher.subscribe("rpc.invalidate", {
        signal,
      })) {
        yield payload;
      }
    }),
  },
};
