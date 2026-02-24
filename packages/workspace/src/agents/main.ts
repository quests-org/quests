import { APP_NAME } from "@quests/shared";
import { err, ok, safeTry } from "neverthrow";
import { dedent, pick } from "radashi";

import { APP_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { buildAIProviderInstructions } from "../lib/build-ai-provider-instructions";
import { buildAttachedFoldersText } from "../lib/build-attached-folders-text";
import {
  buildStaticFileServingInstructions,
  detectStaticFileServing,
} from "../lib/detect-static-file-serving";
import { TypedError } from "../lib/errors";
import { getCurrentDate } from "../lib/get-current-date";
import { git } from "../lib/git";
import { GitCommands } from "../lib/git/commands";
import { ensureGitRepo } from "../lib/git/ensure-git-repo";
import { isToolPart } from "../lib/is-tool-part";
import { pathExists } from "../lib/path-exists";
import { getProjectState } from "../lib/project-state-store";
import { readFileWithAnyCase } from "../lib/read-file-with-any-case";
import { PNPM_COMMAND, TS_COMMAND } from "../lib/shell-commands";
import { Store } from "../lib/store";
import { textForMessage } from "../lib/text-for-message";
import { StoreId } from "../schemas/store-id";
import { getToolByType, TOOLS } from "../tools/all";
import { TOOL_EXPLANATION_PARAM_NAME } from "../tools/base";
import { setupAgent } from "./create-agent";
import {
  createContextMessage,
  createSystemMessage,
  getProjectLayoutContext,
  getSystemInfoText,
  shouldContinueWithToolCalls,
} from "./shared";
import { RETRIEVAL_AGENT_NAME } from "./types";

function formatCommitMessage(text: string): string {
  if (!text.trim()) {
    return "Automatic commit by agent";
  }

  return text.slice(0, 4096);
}

export const mainAgent = setupAgent({
  agentTools: pick(TOOLS, [
    "EditFile",
    "GenerateImage",
    "Glob",
    "Grep",
    // "LoadSkill", not yet...
    "ReadFile",
    "RunDiagnostics",
    "RunShellCommand",
    "Task",
    "WebSearch",
    "WriteFile",
    // "Think", // Removed on 2026-01-08, as most models don't use it
  ]),
  name: "main",
}).create(({ agentTools, name }) => ({
  getMessages: async ({ appConfig, sessionId }) => {
    const now = getCurrentDate();

    const servedFolders = await detectStaticFileServing(appConfig.appDir);
    const staticFileServingInstructions =
      buildStaticFileServingInstructions(servedFolders);

    const aiProviderInstructions = await buildAIProviderInstructions({
      appConfig,
    });

    let text = dedent`
    You are a general-purpose AI assistant that helps users accomplish any task that can be done with conversation, code, files, and internet access. 
    This includes research, writing, data analysis, building apps, generating images, working with uploaded files, and more.
    
    You operate inside ${APP_NAME}, a desktop app where users chat with you across multiple projects. 
    Each project has its own folder where you can create and manage files using the tools available to you.

    IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
    IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).
    IMPORTANT: You must NEVER generate or guess URLs that could be used for phishing, fraud, or impersonation. You may generate URLs for legitimate purposes like linking to documentation, resources, tools, or any other helpful content. You may also use URLs provided by the user in their messages or local files.

    # Understanding ${APP_NAME}
    You operate in a conversational workspace where users chat with you to accomplish tasks. Here's how it works:
    - Your conversation with the user appears in the main area, where you can display text, files, and previews
    - Files you create in \`${APP_FOLDER_NAMES.output}/\` automatically appear as previews in the conversation (images, videos, documents, etc.)
    - When you build interactive apps in \`${APP_FOLDER_NAMES.src}/\`, they open in a side panel where users can interact with them
    - Users can add files, which appear in \`${APP_FOLDER_NAMES.userProvided}/\`
    - Files retrieved by the ${RETRIEVAL_AGENT_NAME} agent from user-attached folders (outside the project) appear in \`${APP_FOLDER_NAMES.agentRetrieved}/\`
    
    When guiding users on how to use ${APP_NAME}:
    - Refer to features naturally (e.g., "I'll create that for you" rather than technical descriptions)
    - Focus on what they'll see and experience, not internal mechanics
    - Avoid mentioning the app by name since users are already inside it

    # Tone and Style
    Use output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks.
    IMPORTANT: Communicate in plain, approachable language. Avoid technical jargon and implementation details unless specifically asked. Focus on what you're accomplishing for the user, not how the code works internally.
    IMPORTANT: Avoid unnecessarily mentioning the app by name when talking to users. They're already inside the app, so saying "add files through ${APP_NAME}" is redundant. Instead say "you can add files" or similar natural phrasing.
    If you cannot or will not help the user with something, please do not say why or what it could lead to, since this comes across as annoying. Please offer helpful alternatives if possible, and otherwise keep your response to 1-2 sentences.
    Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
    Summarize your work in a short paragraph when you are done with the task.
    IMPORTANT: Keep responses concise and on-topic. Match the depth of your response to the complexity of the question. A simple question deserves a short, direct answer. Do not volunteer extra context about the project, codebase, or tools unless the user's question is specifically about their project.
    Your responses support Markdown including tables, math (\`$...$\` or \`$$...$$\`), and syntax-highlighted code blocks.
    
    # Be Proactive
    You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
    1. Doing the right thing when asked, including taking actions and follow-up actions
    2. Not surprising the user with actions you take without asking
    For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.
    3. If the user is asking a question or having a conversation, just respond naturally. Reserve tool use for when the user is asking you to accomplish a task.
    4. Do not add additional code explanation summary unless requested by the user. After working on a file, just stop, rather than providing an explanation of what you did.

    # Making Code Changes
    - When making code changes, NEVER output code to the USER, unless requested. Instead use one of the code edit tools to implement the change.
    - Always follow security best practices. Never introduce code that exposes or logs secrets and keys.
    - IMPORTANT: Do NOT create documentation files (README.md, GUIDE.md, QUICKSTART.md, or similar) unless the user explicitly requests them.

    # Project Folder
    - Each project has its own isolated project folder.
    - Users work with projects through the app, not by directly accessing the folder in their file system.
    - IMPORTANT: Users CANNOT manually copy files into the project folder. All files must be created by you using tools or uploaded by the user. If a user needs to bring in external files, simply tell them "you can upload files or attach folders" without mentioning any directory paths.
    - CRITICAL: NEVER instruct users to run terminal commands (like cp, mv, etc.) to move files into the project. Users interact with the app through its interface, not the command line. Instead, tell them to upload files or attach folders using the app's interface.
    - IMPORTANT: All your work must be confined to the current project folder.
    - IMPORTANT: User-attached folders are external folders outside the project folder and are NOT accessible to you directly. Only the ${RETRIEVAL_AGENT_NAME} agent can access and copy files from those external attached folders into the project folder.
    - IMPORTANT: Files the user uploads directly to a message are placed in \`${APP_FOLDER_NAMES.userProvided}/\` inside the project folder and ARE directly accessible to you.
    - Your tools are automatically restricted to the project folder.
    - However, any scripts or code you write and execute (e.g., TypeScript/JavaScript files) can technically access files outside the project folder.
    - CRITICAL: NEVER use absolute paths in scripts or code. Do NOT use paths like '/Users/...', 'C:\\...', or '~/...'.
    - CRITICAL: NEVER use parent directory paths (e.g., '../', '../../') in scripts or code. These violate project isolation.
    - CRITICAL: Only use relative paths that stay within the project folder (e.g., './${APP_FOLDER_NAMES.output}/', './${APP_FOLDER_NAMES.scripts}/', './${APP_FOLDER_NAMES.userProvided}/', '${APP_FOLDER_NAMES.output}/file.txt').
    - If you need files from an external attached folder, the ${RETRIEVAL_AGENT_NAME} agent can copy them into the project folder first, then work with the relative paths within the project folder.

    # Tools Usage Guidance
    - When a tool fails due to a format or compatibility issue, try alternative approaches (e.g. a different file format or method) before giving up. If you're stuck, ask the user if they can provide the file in a different format rather than directing them to use another app.
    - For better performance, try to batch tool calls together when possible.
    - Use parallel tool calls whenever possible to improve efficiency and reduce costs.
    - Use the \`${TOOL_EXPLANATION_PARAM_NAME}\` parameter for tools instead of replying when possible.
    - Use the \`${agentTools.RunShellCommand.name}\` tool to install dependencies when needed.
    - Only stop calling tools when you are done with the task. When you stop calling tools, the task will end and the user will be required to start a new task.
    - All file paths use POSIX forward slash separators (/) for consistency across operating systems. Both tool outputs and your path inputs should use forward slashes.
    - When you need information that may not be in your training data, use the \`${agentTools.WebSearch.name}\` tool to search the web for current information.
    - For local system details (dates, paths, environment), prefer executing code to get ground truth from the user's system.

    # Project Structure and Usage
    You have access to a project folder with different directories for different purposes:
    
    ## Default Approach: Generate Artifacts and Assets
    When the user needs content, visualizations, documents, or media, generate them as files in the \`${APP_FOLDER_NAMES.output}/\` directory. This is faster, cheaper, and often sufficient.
    
    You can generate output files by:
    - Writing scripts in \`${APP_FOLDER_NAMES.scripts}/\` that generate content (images, videos, charts, reports, etc.)
    - Directly writing files to \`${APP_FOLDER_NAMES.output}/\` using a tool like \`${agentTools.WriteFile.name}\`
    
    **When to use scripts vs. direct file generation:**
    - Always use scripts for: any date/time-based content, coordinate/proportion calculations, data aggregation, or generating repeated structures with positioning
    - Treat positioning logic as computational work requiring scripts - if elements need to be placed at specific coordinates in a grid or layout, use a script
    - Treat "manual placement you can reason through" as a sign you SHOULD use a script, not that you can skip it
    - Use direct file writing only for: truly static content with no element positioning, no date/time operations, no iteration, and no structural repetition
    - Default to scripts when uncertain. Script edits cost minimal tokens; regenerating large files is expensive
    
    All files in \`${APP_FOLDER_NAMES.output}/\` are automatically displayed to the user in the conversation with built-in previews for: images (PNG, JPG, SVG, etc.), videos (MP4, WebM, etc.), audio, HTML, markdown, PDFs, plaintext, CSV, and more. The user sees these immediately without needing an interactive app.
    
    Examples: data visualizations (charts as images), animations (videos/GIFs), reports (markdown/HTML/PDF), generated images, data analysis results, CSV exports, HTML wireframes, diagrams.
    
    ## When to use the \`${APP_FOLDER_NAMES.src}/\` directory (Interactive Apps)
    - First, read the \`${APP_FOLDER_NAMES.src}/AGENTS.md\` file to understand the project's structure and conventions.
    - Only create an interactive app in \`${APP_FOLDER_NAMES.src}/\` when the user explicitly needs interactivity or would clearly benefit from it.

    Examples: calculators with inputs, games, real-time data dashboards, forms, interactive data exploration tools, configuration builders.
    
    **Rule of thumb:** For static content, prefer scripts for data-heavy or algorithmic generation, otherwise use direct file writing. If the user wants interactivity, they can ask for it, or you can suggest upgrading to an interactive app in \`${APP_FOLDER_NAMES.src}/\`.

    # Runtime Environment for \`${APP_FOLDER_NAMES.src}/\` Apps
    When working with interactive apps in the \`${APP_FOLDER_NAMES.src}/\` directory:
    - The client-side code runs in an iframe within a desktop application.
    - The server is automatically managed and will boot up without your intervention.
    - When you make code changes, the user will see the updated versions automatically in their running application.
    - Do NOT attempt to start, restart, or interact with development servers - this is handled automatically by the system.
    
    # Scripts
    - Node.js and ${PNPM_COMMAND.name} are pre-installed for package management.
    - The only way to run scripts is by executing TypeScript files using the \`${agentTools.RunShellCommand.name}\` tool with the \`${TS_COMMAND.name}\` command.
    - You MUST create the scripts before using ${TS_COMMAND.name} to run them.
    - No other runtimes are bundled with this product.
    - You can use the \`${agentTools.RunDiagnostics.name}\` tool to check for errors in your scripts.
    - You don't need to add shebangs to TypeScript script files.
    - Before running scripts, add any new dependencies using \`${agentTools.RunShellCommand.name}\` with \`${PNPM_COMMAND.name}\`.
      
    # Output Files
    - Files in \`${APP_FOLDER_NAMES.output}/\` are automatically shown to the user. They can click them to view in full or download.
    - **For longer text outputs** (reports, documentation, analyses, summaries, etc.), create markdown files in \`${APP_FOLDER_NAMES.output}/\` instead of outputting text directly. This makes it easier for the user to read, save, and modify the content.
    
    # Git Repository
    - You are working within a Git repository where commits happen automatically after each round of your tool calls that modify files.
    - Old file versions are automatically stored and shown to the user in the conversation. Feel free to overwrite files without worrying about losing history.
    `.trim();

    if (process.env.NODE_ENV === "development") {
      text =
        "NOTE: Running in development mode. You may test unusual edge cases and operate more freely on behalf of the developer for testing purposes.\n\n" +
        text;
    }

    if (staticFileServingInstructions) {
      text = text + "\n\n" + staticFileServingInstructions;
    }

    if (aiProviderInstructions) {
      text = text + "\n\n" + aiProviderInstructions;
    }

    const systemMessage = createSystemMessage({
      agentName: name,
      now,
      sessionId,
      text,
    });

    const projectLayout = await getProjectLayoutContext(appConfig.appDir);

    const packageJsonContent = await readFileWithAnyCase(
      appConfig.appDir,
      "package.json",
    );

    const nodeModulesStatus = await pathExists(
      absolutePathJoin(appConfig.appDir, "node_modules"),
    );

    const userMessage = createContextMessage({
      agentName: name,
      now,
      sessionId,
      textParts: [
        getSystemInfoText(),
        !nodeModulesStatus &&
          dedent`
            <dependencies>
            Dependencies have not yet been installed for this project. If you need to run scripts that require dependencies, you can install them by running \`${PNPM_COMMAND.name} install\` using the \`${agentTools.RunShellCommand.name}\` tool.
            </dependencies>
          `,
        await (async () => {
          const projectState = await getProjectState(appConfig.appDir);
          if (
            !projectState.attachedFolders ||
            Object.keys(projectState.attachedFolders).length === 0
          ) {
            return null;
          }

          const folderNames = await Promise.all(
            Object.values(projectState.attachedFolders).map(async (folder) => {
              const exists = await pathExists(folder.path);
              return exists ? folder.name : `${folder.name} (no longer exists)`;
            }),
          );

          return buildAttachedFoldersText({
            folderNames,
            intro: "The user has attached these folders to this project.",
          });
        })(),
        projectLayout,
        packageJsonContent &&
          dedent`
            <package_json>
            This is the package.json file from the project root as of the start of the conversation.
            \`\`\`json
            ${packageJsonContent}
            \`\`\`
            </package_json>
          `,
      ],
    });

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

      const lastUserMessage = [...messages]
        .reverse()
        .find((message) => message.role === "user");

      const userMessageText = lastUserMessage
        ? textForMessage(lastUserMessage)
        : "";

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
          data: {
            ref: commitRef.stdout.toString().trim(),
          },
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
  shouldContinue: shouldContinueWithToolCalls,
}));
