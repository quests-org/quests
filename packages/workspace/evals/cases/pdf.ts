import path from "node:path";

import { defineEval } from "../harness";
import { modelURI } from "../utils";

export const PDF_EVALS = [
  defineEval({
    folders: [
      { path: path.resolve(import.meta.dirname, "../fixtures/pdf-retrieval") },
    ],
    modelURI: modelURI.openRouter("anthropic/claude-sonnet-4.5"),
    name: "pdf-retrieval",
    prompt: "Add a blank page to the pdf in this folder",
  }),
  defineEval({
    folders: [
      { path: path.resolve(import.meta.dirname, "../fixtures/pdf-retrieval") },
    ],
    modelURI: modelURI.openRouter("anthropic/claude-sonnet-4.5"),
    name: "pdf-to-markdown",
    prompt: "Convert the pdf in this folder to markdown",
  }),
];
