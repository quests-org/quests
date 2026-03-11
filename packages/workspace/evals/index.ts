import path from "node:path";

import { defineEval } from "./harness";
import { modelURI } from "./utils";

export const EVALS = [
  // defineEval({
  //   modelURI: modelURI.openRouter("anthropic/claude-haiku-4.5"),
  //   name: "calculator-app",
  //   prompt: "create a calculator app",
  // }),
  // defineEval({
  //   modelURI: modelURI.openRouter("anthropic/claude-sonnet-4.5"),
  //   name: "latest-update-to-arc-raiders",
  //   prompt: "What is the latest update to Arc Raiders?",
  // }),
  // defineEval({
  //   modelURI: modelURI.openRouter("anthropic/claude-sonnet-4.5"),
  //   name: "latest-update-to-arc-raiders",
  //   prompt: "What is the latest update to Arc Raiders?",
  // }),
  defineEval({
    folders: [
      { path: path.resolve(import.meta.dirname, "fixtures/pdf-retrieval") },
    ],
    modelURI: modelURI.openRouter("anthropic/claude-sonnet-4.5"),
    name: "pdf-retrieval",
    prompt: "Add a blank page to the pdf in this folder",
  }),
];
