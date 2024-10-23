import { registryApp } from "./registry-app";
import { app } from "./routes/app";
import { message } from "./routes/message";
import { project } from "./routes/project";
import { runtime } from "./routes/runtime";
import { session } from "./routes/session";

export const router = {
  app,
  message,
  project,
  registryApp,
  runtime,
  session,
};
