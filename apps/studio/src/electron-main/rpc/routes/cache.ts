import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

export const cache = {
  live: {
    onQueryInvalidation: base.handler(async function* ({ signal }) {
      for await (const payload of publisher.subscribe("cache.invalidated", {
        signal,
      })) {
        yield payload;
      }
    }),
  },
};
