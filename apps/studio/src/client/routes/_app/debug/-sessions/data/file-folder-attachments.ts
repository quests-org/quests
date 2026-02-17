import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();

// Using type assertions for RelativePath since these are mock debug values
// and we can't use the runtime schema validation in client code
const userMessageWithFiles = builder.userMessage(
  "Can you review these files and suggest improvements?",
  {
    parts: [
      {
        data: {
          files: [
            {
              filename: "auth.ts",
              filePath: "src/lib/auth.ts" as never,
              gitRef: "abc123def456",
              mimeType: "text/plain",
              size: 2048,
            },
            {
              filename: "database.ts",
              filePath: "src/lib/database.ts" as never,
              gitRef: "abc123def456",
              mimeType: "text/plain",
              size: 4096,
            },
            {
              filename: "config.json",
              filePath: "src/config.json" as never,
              gitRef: "abc123def456",
              mimeType: "application/json",
              size: 512,
            },
          ],
        },
        type: "data-attachments" as const,
      },
    ],
  },
);

const assistantMessage1 = builder.assistantMessage(
  "I'll review these files and provide suggestions for improvement.",
);

const userMessageWithFolder = builder.userMessage(
  "Now look at this entire components folder",
  {
    parts: [
      {
        data: {
          files: [],
          folders: [
            {
              createdAt: 1_718_198_400_000,
              id: "components" as never,
              name: "components",
              path: "/tmp" as never,
            },
          ],
        },
        type: "data-attachments",
      },
    ],
  },
);

const assistantMessage2 = builder.assistantMessage(
  "I see you've shared the components folder. Let me analyze the structure and patterns.",
);

const userMessageMixed = builder.userMessage(
  "Compare these test files with the implementation",
  {
    parts: [
      {
        data: {
          files: [
            {
              filename: "auth.test.ts",
              filePath: "tests/auth.test.ts" as never,
              gitRef: "ghi345jkl678",
              mimeType: "text/plain",
              size: 2560,
            },
            {
              filename: "auth.ts",
              filePath: "src/lib/auth.ts" as never,
              gitRef: "ghi345jkl678",
              mimeType: "text/plain",
              size: 2048,
            },
          ],
        },
        type: "data-attachments",
      },
    ],
  },
);

const assistantMessage3 = builder.assistantMessage(
  "I'll compare the test coverage with the implementation to identify any gaps.",
);

registerSession({
  messages: [
    userMessageWithFiles,
    assistantMessage1,
    userMessageWithFolder,
    assistantMessage2,
    userMessageMixed,
    assistantMessage3,
  ],
  name: "File and Folder Attachments",
});
