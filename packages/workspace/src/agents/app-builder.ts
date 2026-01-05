import { err, ok, safeTry } from "neverthrow";
import { dedent, pick } from "radashi";
import { readPackage } from "read-pkg";

import { APP_FOLDER_NAMES, APP_NAME, WEBSITE_URL } from "../constants";
import {
  buildStaticFileServingInstructions,
  detectStaticFileServing,
} from "../lib/detect-static-file-serving";
import { TypedError } from "../lib/errors";
import { fileTree } from "../lib/file-tree";
import { getCurrentDate } from "../lib/get-current-date";
import { getSystemInfo } from "../lib/get-system-info";
import { git } from "../lib/git";
import { GitCommands } from "../lib/git/commands";
import { ensureGitRepo } from "../lib/git/ensure-git-repo";
import { isToolPart } from "../lib/is-tool-part";
import { readFileWithAnyCase } from "../lib/read-file-with-any-case";
import { Store } from "../lib/store";
import { textForMessage } from "../lib/text-for-message";
import { type SessionMessage } from "../schemas/session/message";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { StoreId } from "../schemas/store-id";
import { getToolByType, TOOLS } from "../tools/all";
import { TOOL_EXPLANATION_PARAM_NAME } from "../tools/base";
import { setupAgent } from "./create-agent";

function formatCommitMessage(text: string): string {
  if (!text.trim()) {
    return "Automatic commit by agent";
  }

  return text.slice(0, 4096);
}

export const appBuilderAgent = setupAgent({
  agentTools: pick(TOOLS, [
    "EditFile",
    "Glob",
    "Grep",
    "ReadFile",
    "RunDiagnostics",
    "RunShellCommand",
    "Think",
    "WriteFile",
  ]),
  name: "app-builder",
}).create(({ agentTools, name }) => ({
  getMessages: async ({ appConfig, envVariableNames, sessionId }) => {
    const now = getCurrentDate();

    const packageJson = await readPackage({ cwd: appConfig.appDir }).catch(
      () => null,
    );

    const hasTsx = Boolean(
      packageJson?.dependencies?.tsx || packageJson?.devDependencies?.tsx,
    );
    const servedFolders = await detectStaticFileServing(appConfig.appDir);
    const staticFileServingInstructions =
      buildStaticFileServingInstructions(servedFolders);

    const systemMessageId = StoreId.newMessageId();
    const systemMessage: SessionMessage.ContextWithParts = {
      id: systemMessageId,
      metadata: {
        agentName: name,
        createdAt: now,
        realRole: "system",
        sessionId,
      },
      parts: [
        {
          metadata: {
            createdAt: now,
            endedAt: now,
            id: StoreId.newPartId(),
            messageId: systemMessageId,
            sessionId,
          },
          state: "done",
          text: dedent`
          You are the ${name} agent inside ${APP_NAME}, a desktop app for building and running local apps.

          IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
          IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).
          IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

          When the user directly asks about ${APP_NAME} (eg 'can ${APP_NAME} do...', 'does ${APP_NAME} have...') or asks in second person (eg 'are you able...', 'can you do...'), direct them to ${WEBSITE_URL}

          # Tone and style
          Use output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks.
          If you cannot or will not help the user with something, please do not say why or what it could lead to, since this comes across as annoying. Please offer helpful alternatives if possible, and otherwise keep your response to 1-2 sentences.
          Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
          Summarize your work in a short paragraph at the end of your response.
          IMPORTANT: You should minimize output tokens as much as possible while maintaining helpfulness, quality, and accuracy. Only address the specific query or task at hand, avoiding tangential information unless absolutely critical for completing the request. If you can answer in 1-3 sentences or a short paragraph, please do.
          
          ## Be proactive
          You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
          1. Doing the right thing when asked, including taking actions and follow-up actions
          2. Not surprising the user with actions you take without asking
          For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.
          3. Do not add additional code explanation summary unless requested by the user. After working on a file, just stop, rather than providing an explanation of what you did.

          ## Follow conventions
          When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
          - NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library. For example, you might look at neighboring files, or check the package.json (or cargo.toml, and so on depending on the language).
          - When you create a new component, first look at existing components to see how they're written; then consider framework choice, naming conventions, typing, and other conventions.
          - When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
          - Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.

          ## Tools usage guidance
          - For better performance, try to batch tool calls together when possible.
          - Use parallel tool calls whenever possible to improve efficiency and reduce costs.
          - Use the \`${TOOL_EXPLANATION_PARAM_NAME}\` parameter for tools instead of replying when possible.
          - Use the \`${agentTools.RunShellCommand.name}\` tool to install dependencies when needed.
          - Only stop calling tools when you are done with the task. When you stop calling tools, the task will end and the user will be required to start a new task.
          - All file paths use POSIX forward slash separators (/) for consistency across operating systems. Both tool outputs and your path inputs should use forward slashes.
            
          ## Making code changes
          When making code changes, NEVER output code to the USER, unless requested. Instead use one of the code edit tools to implement the change.

          It is *EXTREMELY* important that your generated code can be run immediately by the USER. To ensure this, follow these instructions carefully:
          1. Add all necessary import statements, dependencies, and endpoints required to run the code.
          2. If you're building a web app from scratch, give it a beautiful and modern UI, imbued with best UX practices.
          3. NEVER generate an extremely long hash or any non-textual code, such as binary. These are not helpful to the USER and are very expensive.
          4. If you've introduced (linter) errors, fix them if clear how to (or you can easily figure out how to). Do not make uneducated guesses. And DO NOT loop more than 3 times on fixing linter errors on the same file. On the third time, you should stop and ask the user what to do next.
          5. Do not add comments unless asked.

          # Runtime Environment
          You are operating within an automated app builder environment with the following characteristics:
          - The client-side code runs in an iframe within a desktop application
          - The server is automatically managed and will boot up without your intervention
          - When you make code changes, the user will see the updated versions automatically in their running application
          - You are working within a Git repository where commits happen automatically after each round of your code edits
          - Do NOT attempt to start, restart, or interact with development servers - this is handled automatically by the system
          - ${hasTsx ? `The \`tsx\` CLI tool is installed for running scripts, e.g. \`tsx ${APP_FOLDER_NAMES.scripts}/example.ts\`.` : ""}

          ## Important Folders
          - Place scripts in the \`${APP_FOLDER_NAMES.scripts}/\` directory.
          - Files the user uploads for the agent are stored in \`./${APP_FOLDER_NAMES.uploads}/\`.
          - Files in \`./${APP_FOLDER_NAMES.output}/\` are automatically shown to the user in the conversation. The user can click them to view or download. Built-in preview for: images, HTML, plaintext, markdown, audio, video, PDFs, and more.
          
          ${staticFileServingInstructions}
          `.trim(),
          type: "text",
        },
      ],
      role: "session-context",
    };

    const fileTreeResult = await fileTree(appConfig.appDir);

    const agentsContent = await readFileWithAnyCase(
      appConfig.appDir,
      "AGENTS.md",
    );

    const packageJsonContent = await readFileWithAnyCase(
      appConfig.appDir,
      "package.json",
    );

    const userMessageId = StoreId.newMessageId();
    const userMessage: SessionMessage.ContextWithParts = {
      id: userMessageId,
      metadata: {
        agentName: name,
        createdAt: now,
        realRole: "user",
        sessionId,
      },
      parts: [
        {
          metadata: {
            createdAt: now,
            endedAt: now,
            id: StoreId.newPartId(),
            messageId: userMessageId,
            sessionId,
          },
          state: "done",
          text: dedent`
            <system_info>
            Operating system: ${getSystemInfo()}
            Current date: ${now.toLocaleDateString("en-US", { day: "numeric", month: "long", weekday: "long", year: "numeric" })}
            </system_info>

            ${fileTreeResult.match(
              (tree) => dedent`
                <project_layout>
                This is the current project directory structure. All files and folders shown below exist right now. This structure will not update during the conversation, but should be considered accurate at the start.
                \`\`\`plaintext
                ${tree}
                \`\`\`
                </project_layout>
              `,
              () => "",
            )}

            ${
              agentsContent
                ? dedent`
              <agents_md>
              The AGENTS.md file provides detailed context and instructions specifically for coding agents.
              ${agentsContent}
              </agents_md>
            `
                : ""
            }

            ${
              packageJsonContent
                ? dedent`
              <package_json>
              This is the package.json file from the project root as of the start of the conversation.
              \`\`\`json
              ${packageJsonContent}
              \`\`\`
              </package_json>
            `
                : ""
            }
            
            ${
              envVariableNames.length > 0
                ? dedent`
              <env_variables>
              The following environment variables are available for the app and scripts.
              ${envVariableNames.map((n) => `- ${n}`).join("\n")}
              </env_variables>
            `
                : ""
            }
          `.trim(),
          type: "text",
        },
      ],
      role: "session-context",
    };

    return [systemMessage, userMessage];
  },
  onFinish: async ({ appConfig, parentMessageId, sessionId, signal }) => {
    const result = await safeTry(async function* () {
      yield* ensureGitRepo({ appDir: appConfig.appDir, signal });
      const status = yield* git(GitCommands.status(), appConfig.appDir, {
        signal,
      });

      if (status.stdout.toString().trim() === "") {
        // No files were changed, so no commit is needed
        return ok(undefined);
      }

      const messageIds = yield* Store.getMessageIdsAfter(
        sessionId,
        parentMessageId,
        appConfig,
        { signal },
      );

      const messages = yield* Store.getMessagesWithParts(
        {
          appConfig,
          messageIds: [parentMessageId, ...messageIds],
          sessionId,
        },
        { signal },
      );

      const usedNonReadOnlyTools = messages.some((message) =>
        message.parts.some(
          (part) => isToolPart(part) && !getToolByType(part.type).readOnly,
        ),
      );

      if (!usedNonReadOnlyTools) {
        return ok(undefined);
      }

      const assistantMessages = messages.filter(
        (message) => message.role === "assistant",
      );
      const lastAssistantMessage = assistantMessages.at(-1);

      if (!lastAssistantMessage) {
        return err(new TypedError.NotFound("No assistant message found"));
      }

      // Find the last user message
      const lastUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === "user");

      const userMessageText = lastUserMessage
        ? textForMessage(lastUserMessage)
        : "";

      // Stage all changes first
      yield* git(GitCommands.addAll(), appConfig.appDir, { signal });

      const commitMessage = formatCommitMessage(userMessageText);

      yield* git(
        GitCommands.commitWithAuthor(commitMessage),
        appConfig.appDir,
        { signal },
      );
      const commitRef = yield* git(
        GitCommands.revParse("HEAD"),
        appConfig.appDir,
        { signal },
      );

      yield* Store.savePart(
        {
          // Make this more safe when we have more data parts
          data: {
            ref: commitRef.stdout.toString().trim(),
          } satisfies SessionMessageDataPart.GitCommitDataPart,
          metadata: {
            createdAt: new Date(),
            id: StoreId.newPartId(),
            messageId: lastAssistantMessage.id,
            sessionId,
          },
          type: "data-gitCommit",
        },
        appConfig,
        { signal },
      );
      return ok(undefined);
    });
    if (result.isErr()) {
      appConfig.workspaceConfig.captureException(result.error);
    }
  },
  onStart: async () => {
    // no-op for now. may be used for snapshotting the app state
  },
  shouldContinue: ({ messages }) => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    // Continue if no assistant message was found
    if (!lastAssistantMessage) {
      return Promise.resolve(true);
    }

    // Continue if last assistant message has tool calls
    return Promise.resolve(
      lastAssistantMessage.parts.some((part) => isToolPart(part)),
    );
  },
}));
