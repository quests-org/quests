import { type SessionMessagePart } from "@quests/workspace/client";

import { cleanFilePath } from "../../lib/file-utils";
import { AttachmentItem } from "../attachment-item";
import { CodeBlock } from "./code-block";
import { ToolPartFilePath } from "./file-path";
import { MonoText } from "./mono-text";
import { ScrollableCodeBlock } from "./scrollable-code-block";
import { SectionHeader } from "./section-header";

export function ToolPartReadFile({
  input,
  output,
}: {
  input: { limit?: number; offset?: number };
  output: Extract<
    SessionMessagePart.ToolPart,
    { state: "output-available"; type: "tool-read_file" }
  >["output"];
}) {
  switch (output.state) {
    case "audio":
    case "image":
    case "pdf":
    case "video": {
      const dataUrl = `data:${output.mimeType};base64,${output.base64Data}`;
      const filename = output.filePath.split("/").pop() || output.filePath;
      return (
        <div>
          <SectionHeader>Read {cleanFilePath(output.filePath)}</SectionHeader>
          <AttachmentItem
            filename={filename}
            filePath={output.filePath}
            mimeType={output.mimeType}
            previewUrl={dataUrl}
          />
        </div>
      );
    }
    case "does-not-exist": {
      return (
        <div>
          <ToolPartFilePath
            filePath={output.filePath}
            label="File not found:"
          />
          {output.suggestions.length > 0 && (
            <div className="mt-2">
              <SectionHeader>Suggestions:</SectionHeader>
              <div className="space-y-1">
                {output.suggestions.map((suggestion, index) => (
                  <MonoText
                    className="text-xs text-muted-foreground"
                    key={index}
                  >
                    {suggestion}
                  </MonoText>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case "exists": {
      return (
        <div>
          <SectionHeader>File: {cleanFilePath(output.filePath)}</SectionHeader>
          {input.offset !== undefined && input.offset > 0 && (
            <div className="text-muted-foreground text-xs mb-1">
              Starting from line {input.offset + 1}
            </div>
          )}
          {input.limit !== undefined && (
            <div className="text-muted-foreground text-xs mb-1">
              Reading {input.limit} lines
            </div>
          )}
          {output.content && (
            <ScrollableCodeBlock>{output.content}</ScrollableCodeBlock>
          )}
          <div className="text-muted-foreground text-xs mt-1">
            Showing {output.displayedLines} lines
            {output.hasMoreLines && " (truncated)"}
            {output.offset > 0 && ` (offset: ${output.offset})`}
          </div>
        </div>
      );
    }
    case "unsupported-format": {
      const message =
        output.reason === "unsupported-image-format"
          ? "Unsupported image format."
          : "Cannot read binary file.";

      return (
        <div>
          <ToolPartFilePath
            filePath={output.filePath}
            label="Unsupported format:"
          />
          {output.mimeType && (
            <div className="text-muted-foreground text-xs mt-2">
              {output.mimeType}
            </div>
          )}
          <div className="text-destructive text-sm mt-2">{message}</div>
        </div>
      );
    }
    default: {
      const _exhaustiveCheck: never = output;
      return (
        <div>
          <SectionHeader>Unknown file state</SectionHeader>
          <CodeBlock>{JSON.stringify(_exhaustiveCheck, null, 2)}</CodeBlock>
        </div>
      );
    }
  }
}
