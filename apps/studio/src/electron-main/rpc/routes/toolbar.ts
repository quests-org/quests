import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { z } from "zod";

const setMenuHeight = base
  .input(z.object({ height: z.number() }))
  .handler(({ input }) => {
    publisher.publish("menu.height-updated", {
      height: input.height,
    });
  });

export const toolbar = {
  setMenuHeight,
};
