import { z } from "zod";

import { AbsolutePathSchema } from "./paths";

export namespace FolderAttachment {
  export const IdSchema = z.string().brand("FolderAttachmentId");

  export const Schema = z.object({
    createdAt: z.int().min(0),
    id: IdSchema,
    name: z.string(),
    path: AbsolutePathSchema,
  });

  export type Type = z.output<typeof Schema>;
}
