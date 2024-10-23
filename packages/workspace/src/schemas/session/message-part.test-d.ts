import { describe, expectTypeOf, it } from "vitest";

import { type SessionMessagePart } from "./message-part";
import { type SessionMessageRelaxedPart } from "./message-relaxed-part";

describe("SessionMessagePart", () => {
  it("validates that SessionMessageRelaxedPart.Type is a subset of SessionMessage.WithParts['parts'][number]", () => {
    const x: SessionMessagePart.Type = {} as SessionMessagePart.Type;
    expectTypeOf(x).toExtend<SessionMessageRelaxedPart.Type>();
  });

  it("validates text part type compatibility", () => {
    const textPart: SessionMessagePart.TextPart =
      {} as SessionMessagePart.TextPart;
    expectTypeOf(textPart).toExtend<SessionMessageRelaxedPart.TextPart>();
  });

  it("validates reasoning part type compatibility", () => {
    const reasoningPart: SessionMessagePart.ReasoningPart =
      {} as SessionMessagePart.ReasoningPart;
    expectTypeOf(
      reasoningPart,
    ).toExtend<SessionMessageRelaxedPart.ReasoningPart>();
  });

  it("validates data part type compatibility", () => {
    const dataPart: SessionMessagePart.DataPart =
      {} as SessionMessagePart.DataPart;
    expectTypeOf(dataPart).toExtend<SessionMessageRelaxedPart.DataPart>();
  });

  it("validates tool part type compatibility", () => {
    const toolPart: SessionMessagePart.ToolPart =
      {} as SessionMessagePart.ToolPart;
    expectTypeOf(toolPart).toExtend<SessionMessageRelaxedPart.ToolPart>();
  });

  it("validates file part type compatibility", () => {
    const filePart: SessionMessagePart.FilePart =
      {} as SessionMessagePart.FilePart;
    expectTypeOf(filePart).toExtend<SessionMessageRelaxedPart.Type>();
  });

  it("validates source document part type compatibility", () => {
    const sourceDocumentPart: SessionMessagePart.SourceDocumentPart =
      {} as SessionMessagePart.SourceDocumentPart;
    expectTypeOf(sourceDocumentPart).toExtend<SessionMessageRelaxedPart.Type>();
  });

  it("validates source url part type compatibility", () => {
    const sourceUrlPart: SessionMessagePart.SourceUrlPart =
      {} as SessionMessagePart.SourceUrlPart;
    expectTypeOf(sourceUrlPart).toExtend<SessionMessageRelaxedPart.Type>();
  });

  it("validates step start part type compatibility", () => {
    const stepStartPart: SessionMessagePart.StepStartPart =
      {} as SessionMessagePart.StepStartPart;
    expectTypeOf(stepStartPart).toExtend<SessionMessageRelaxedPart.Type>();
  });
});
