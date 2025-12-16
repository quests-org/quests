import { z } from "zod";

export namespace Upload {
  export const Schema = z.object({
    content: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
  });

  export type Type = z.output<typeof Schema>;
}
