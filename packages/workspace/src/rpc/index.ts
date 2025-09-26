import { app } from "./routes/app";
import { message } from "./routes/message";
import { project } from "./routes/project";
import { registry } from "./routes/registry";
import { runtime } from "./routes/runtime";
import { session } from "./routes/session";

export const router = {
  app,
  message,
  project,
  registry,
  runtime,
  session,
};
