import fs from "node:fs/promises";
import path from "node:path";

import { APP_FOLDER_NAMES } from "../../src/constants";
import { type AppConfig } from "../../src/lib/app-config/types";
import { type Assertion, defineEval } from "../harness";

const assertHasOutputMarkdown: Assertion = {
  check: async ({ appConfig }) => {
    const outputDir = path.join(appConfig.appDir, APP_FOLDER_NAMES.output);
    let files: string[] = [];
    try {
      files = await fs.readdir(outputDir);
    } catch {
      return {
        evidence: `Output folder not found at ${outputDir}`,
        passed: false,
        text: "Has a markdown file in the output folder",
      };
    }
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    return {
      evidence:
        mdFiles.length > 0
          ? `Found markdown file(s): ${mdFiles.join(", ")}`
          : "No markdown files found in output folder",
      passed: mdFiles.length > 0,
      text: "Has a markdown file in the output folder",
    };
  },
  text: "Has a markdown file in the output folder",
};

const assertHasAgentRetrievedPdf: Assertion = {
  check: async ({ appConfig }) => {
    const agentRetrievedDir = path.join(
      appConfig.appDir,
      APP_FOLDER_NAMES.agentRetrieved,
    );
    let files: string[] = [];
    try {
      files = await fs.readdir(agentRetrievedDir);
    } catch {
      return {
        evidence: `Agent-retrieved folder not found at ${agentRetrievedDir}`,
        passed: false,
        text: "Has a PDF in the agent-retrieved folder",
      };
    }
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
    return {
      evidence:
        pdfFiles.length > 0
          ? `Found PDF file(s): ${pdfFiles.join(", ")}`
          : "No PDF files found in agent-retrieved folder",
      passed: pdfFiles.length > 0,
      text: "Has a PDF in the agent-retrieved folder",
    };
  },
  text: "Has a PDF in the agent-retrieved folder",
};

async function hasMdInOutput(appConfig: AppConfig): Promise<boolean> {
  const dir = path.join(appConfig.appDir, APP_FOLDER_NAMES.output);
  try {
    const files = await fs.readdir(dir);
    return files.some((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
}

async function hasPdfInAgentRetrieved(appConfig: AppConfig): Promise<boolean> {
  const dir = path.join(appConfig.appDir, APP_FOLDER_NAMES.agentRetrieved);
  try {
    const files = await fs.readdir(dir);
    return files.some((f) => f.toLowerCase().endsWith(".pdf"));
  } catch {
    return false;
  }
}

export const RETRIEVAL_EVALS = [
  defineEval({
    assertions: [assertHasAgentRetrievedPdf],
    folders: [
      { path: path.resolve(import.meta.dirname, "../fixtures/pdf-retrieval") },
    ],
    name: "pdf-retrieval",
    prompt: "Add a blank page to the pdf in this folder",
    shouldStop: async (part, appConfig) => {
      if (
        part.type !== "tool-copy_to_project" ||
        part.state !== "output-available"
      ) {
        return false;
      }
      return hasPdfInAgentRetrieved(appConfig);
    },
  }),
  defineEval({
    assertions: [assertHasOutputMarkdown],
    folders: [
      { path: path.resolve(import.meta.dirname, "../fixtures/pdf-retrieval") },
    ],
    name: "pdf-to-markdown",
    prompt: "Convert the pdf in this folder to markdown",
    shouldStop: async (part, appConfig) => {
      if (
        part.type !== "tool-copy_to_project" ||
        part.state !== "output-available"
      ) {
        return false;
      }
      return hasMdInOutput(appConfig);
    },
  }),
];
