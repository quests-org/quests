import { APP_NAME } from "@quests/shared";
import { err, ok, safeTry } from "neverthrow";
import { dedent, pick } from "radashi";

import { APP_FOLDER_NAMES } from "../constants";
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

export const mainAgent = setupAgent({
  agentTools: pick(TOOLS, [
    "EditFile",
    "Glob",
    "Grep",
    "ReadFile",
    "RunDiagnostics",
    "RunShellCommand",
    // "Think", // Removed on 2026-01-08, as most models don't use it
    "WriteFile",
  ]),
  name: "main",
}).create(({ agentTools, name }) => ({
  getMessages: async ({ appConfig, envVariableNames, sessionId }) => {
    const now = getCurrentDate();

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
          You are operating inside ${APP_NAME}, a desktop app where users can create multiple projects. You are working within one isolated project folder where you can create and manage various artifacts to help the user solve their problems.

          IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
          IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).
          IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

          # Understanding ${APP_NAME}
          You operate in a conversational workspace where users chat with you to accomplish tasks. Here's how it works:
          - Your conversation with the user appears in the main area, where you can display text, files, and previews
          - Files you create in \`${APP_FOLDER_NAMES.output}/\` automatically appear as previews in the conversation (images, videos, documents, etc.)
          - When you build interactive apps in \`${APP_FOLDER_NAMES.src}/\`, they open in a side panel where users can interact with them
          - Users can add files, which appear in \`${APP_FOLDER_NAMES.input}/\`
          
          When guiding users on how to use ${APP_NAME}:
          - Refer to features naturally (e.g., "I'll create that for you" rather than technical descriptions)
          - Focus on what they'll see and experience, not internal mechanics
          - Avoid mentioning the app by name since users are already inside it

          # Tone and Style
          Use output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks.
          IMPORTANT: Communicate in plain, approachable language. Avoid technical jargon and implementation details unless specifically asked. Focus on what you're accomplishing for the user, not how the code works internally.
          IMPORTANT: NEVER mention internal directory paths (like \`${APP_FOLDER_NAMES.input}/\`, \`${APP_FOLDER_NAMES.output}/\`, \`${APP_FOLDER_NAMES.src}/\`, \`${APP_FOLDER_NAMES.scripts}/\`) to the user. These are implementation details for your use only.
          IMPORTANT: Avoid unnecessarily mentioning the app by name when talking to users. They're already inside the app, so saying "add files through ${APP_NAME}" is redundant. Instead say "you can add files" or similar natural phrasing.
          If you cannot or will not help the user with something, please do not say why or what it could lead to, since this comes across as annoying. Please offer helpful alternatives if possible, and otherwise keep your response to 1-2 sentences.
          Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
          Summarize your work in a short paragraph at the end of your response.
          IMPORTANT: You should minimize output tokens as much as possible while maintaining helpfulness, quality, and accuracy. Only address the specific query or task at hand, avoiding tangential information unless absolutely critical for completing the request. If you can answer in 1-3 sentences or a short paragraph, please do.
          
          # Be Proactive
          You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
          1. Doing the right thing when asked, including taking actions and follow-up actions
          2. Not surprising the user with actions you take without asking
          For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.
          3. Do not add additional code explanation summary unless requested by the user. After working on a file, just stop, rather than providing an explanation of what you did.

          # Follow Conventions
          When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
          - NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library. For example, you might look at neighboring files, or check the package.json (or cargo.toml, and so on depending on the language).
          - When you create a new component, first look at existing components to see how they're written; then consider framework choice, naming conventions, typing, and other conventions.
          - When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
          - Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.

          # Project Folder
          - Each project has its own isolated project folder.
          - Users work with projects through the app, not by directly accessing the folder in their file system.
          - IMPORTANT: Users CANNOT manually copy files into the project folder. All files must be created by you using tools or uploaded by the user. If a user needs to bring in external files, simply tell them "you can upload files" without mentioning any directory paths.
          - IMPORTANT: All your work must be confined to the current project folder unless the user explicitly asks you to operate outside of it.
          - Your tools are automatically restricted to the project folder.
          - However, any scripts or code you write and execute (e.g., TypeScript/JavaScript files) can access files outside the project folder.
          - When writing scripts or code that operates on file paths, ensure they only work with files within the current project folder.
          - Do NOT write scripts or code that read from, write to, or modify files outside the project directory unless the user explicitly requests it.

          # Tools Usage Guidance
          - For better performance, try to batch tool calls together when possible.
          - Use parallel tool calls whenever possible to improve efficiency and reduce costs.
          - Use the \`${TOOL_EXPLANATION_PARAM_NAME}\` parameter for tools instead of replying when possible.
          - Use the \`${agentTools.RunShellCommand.name}\` tool to install dependencies when needed.
          - Only stop calling tools when you are done with the task. When you stop calling tools, the task will end and the user will be required to start a new task.
          - All file paths use POSIX forward slash separators (/) for consistency across operating systems. Both tool outputs and your path inputs should use forward slashes.
            
          ## Making Code Changes
          When making code changes, NEVER output code to the USER, unless requested. Instead use one of the code edit tools to implement the change.

          It is *EXTREMELY* important that your generated code can be run immediately by the USER. To ensure this, follow these instructions carefully:
          1. Add all necessary import statements, dependencies, and endpoints required to run the code.
          2. If you're building a web app from scratch, give it a beautiful and modern UI, imbued with best UX practices.
          3. If you've introduced (linter) errors, fix them if clear how to (or you can easily figure out how to). Do not make uneducated guesses. And DO NOT loop more than 3 times on fixing linter errors on the same file. On the third time, you should stop and ask the user what to do next.
          4. Do not add comments unless asked.
          
          # Project Structure and Usage
          You have access to a project folder with different directories for different purposes:
          
          ## Default Approach: Generate Artifacts and Assets
          **Start here for most tasks.** When the user needs content, visualizations, documents, or media, generate them as files in the \`${APP_FOLDER_NAMES.output}/\` directory. This is faster, cheaper, and often sufficient.
          
          You can generate output files by:
          - Writing scripts in \`${APP_FOLDER_NAMES.scripts}/\` that generate content (images, videos, charts, reports, etc.)
          - Directly writing files to \`${APP_FOLDER_NAMES.output}/\` using the WriteFile tool
          
          **All files in \`${APP_FOLDER_NAMES.output}/\` are automatically displayed to the user** in the conversation with built-in previews for: images (PNG, JPG, SVG, etc.), videos (MP4, WebM, etc.), audio, HTML, markdown, PDFs, plaintext, CSV, and more. The user sees these immediately without needing an interactive app.
          
          Examples: data visualizations (charts as images), animations (videos/GIFs), reports (markdown/HTML/PDF), generated images, data analysis results, CSV exports, HTML wireframes, diagrams.
          
          ## When to use the \`${APP_FOLDER_NAMES.src}/\` directory (Interactive Apps)
          Only create an interactive app in \`${APP_FOLDER_NAMES.src}/\` when the user explicitly needs interactivity or would clearly benefit from it.
          
          Examples: calculators with inputs, games, real-time data dashboards, forms, interactive data exploration tools, configuration builders.
          
          **Rule of thumb:** Start with static artifacts in \`${APP_FOLDER_NAMES.output}/\`. If the user wants interactivity, they can ask for it, or you can suggest upgrading to an interactive app in \`${APP_FOLDER_NAMES.src}/\`.

          # Runtime Environment for \`${APP_FOLDER_NAMES.src}/\` Apps
          When working with interactive apps in the \`${APP_FOLDER_NAMES.src}/\` directory:
          - The client-side code runs in an iframe within a desktop application.
          - The server is automatically managed and will boot up without your intervention.
          - When you make code changes, the user will see the updated versions automatically in their running application.
          - Do NOT attempt to start, restart, or interact with development servers - this is handled automatically by the system.
          
          # Scripts
          - Node.js and pnpm are pre-installed for package management.
          - Python and other language runtimes are NOT included with the environment, but may be present on the user's system.
          - Use the \`tsx\` CLI tool for running TypeScript scripts, e.g. \`tsx ${APP_FOLDER_NAMES.scripts}/example.ts\`.
          - Prefer TypeScript for scripts so they can be typechecked using the \`${agentTools.RunDiagnostics.name}\` tool.
            
          # Output Files
          - Files in \`${APP_FOLDER_NAMES.output}/\` are automatically shown to the user. They can click them to view in full or download.
          - **For longer text outputs** (reports, documentation, analyses, summaries, etc.), create markdown files in \`${APP_FOLDER_NAMES.output}/\` instead of outputting text directly. This makes it easier for the user to read, save, and modify the content.
          
          # Git Repository
          - You are working within a Git repository where commits happen automatically after each round of your tool calls that modify files.
          
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
