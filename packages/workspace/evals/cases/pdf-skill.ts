import fs from "node:fs";
import path from "node:path";

import { type SessionMessagePart } from "../../src/schemas/session/message-part";
import { type Assertion, defineEval } from "../harness";

const PDF_SKILL_NAME = "pdf";

const pdfPath = path.resolve(
  import.meta.dirname,
  "../fixtures/pdf-retrieval/sample.pdf",
);
const pdfContent = fs.readFileSync(pdfPath).toString("base64");

function isLoadSkillPdfPart(part: SessionMessagePart.Type): boolean {
  if (part.type !== "tool-load_skill") {
    return false;
  }
  return part.input?.name === PDF_SKILL_NAME;
}

const hasLoadSkillPdfPart = (
  sessions: { messages: { parts: SessionMessagePart.Type[] }[] }[],
) =>
  sessions.some((s) =>
    s.messages.some((m) => m.parts.some(isLoadSkillPdfPart)),
  );

const assertLoadsPdfSkill: Assertion = {
  check: ({ sessions }) => {
    const loaded = hasLoadSkillPdfPart(sessions);
    return {
      evidence: loaded
        ? `Found load_skill call for "${PDF_SKILL_NAME}" in session`
        : `No load_skill call for "${PDF_SKILL_NAME}" found in session`,
      passed: loaded,
      text: "Loads PDF skill",
    };
  },
  text: "Loads PDF skill",
};

const stopOnLoadSkillPdf = (part: SessionMessagePart.Type) =>
  isLoadSkillPdfPart(part) &&
  "state" in part &&
  part.state === "output-available";

export const PDF_SKILL_EVALS = [
  defineEval({
    assertions: [assertLoadsPdfSkill],
    files: [{ content: pdfContent, filename: "sample.pdf" }],
    name: "triggers-pdf-skill",
    prompt: "Convert this PDF to markdown",
    shouldStop: stopOnLoadSkillPdf,
  }),
  defineEval({
    assertions: [assertLoadsPdfSkill],
    name: "create-pdf",
    prompt:
      "Make me a new PDF with a red square in it and a blue square below it",
  }),
];
