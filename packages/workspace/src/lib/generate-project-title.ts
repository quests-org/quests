import { generateText } from "ai";
import { type LanguageModel } from "ai";
import { ResultAsync } from "neverthrow";
import { dedent } from "radashi";

import { type SessionMessage } from "../schemas/session/message";
import { textForMessage } from "./text-for-message";

const MAX_TITLE_WORDS = 5;

type TitleType = "chat" | "project";

export function generateAppTitle({
  message,
  model,
  templateTitle,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  templateTitle?: string;
}) {
  return generateTitle({ message, model, templateTitle, type: "project" });
}

export function generateChatTitle({
  message,
  model,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
}) {
  return generateTitle({ message, model, type: "chat" });
}

function buildSystemPrompt(type: TitleType, templateTitle?: string): string {
  const timeContext = getTimeContext();
  const entityName = type === "project" ? "project" : "chat";

  const contextSection =
    type === "project" && templateTitle
      ? `The project is based on the "${templateTitle}" template.`
      : "";

  const baseExamples = dedent`
    "What is the weather like today in San Francisco?" → Weather inquiry
    "Help me debug this Python code that's throwing an error" → Python debugging help
    "Explain how React hooks work" → React hooks explanation
    "What did I upload?" → File upload inquiry
    "Can you help me with something?" → ${timeContext} ${entityName}
    "Analyze this data\n\nFiles attached by user: sales_data.xlsx" → Sales data analysis
    "Help me visualize this\n\nFiles attached by user: chart.csv, metrics.json" → Data visualization
    "Process these images\n\nFiles attached by user: photo1.jpg, photo2.png" → Image processing
    "Review this document\n\nFiles attached by user: report.pdf" → Document review`;

  const appExamples = dedent`
    "Build me a calculator app" → Calculator app
    "Create a todo list with drag and drop" → Todo list
    "Make a kanban board for project management" → Kanban board`;

  const examples =
    type === "project"
      ? dedent`
        <examples>
        ${appExamples}
        ${baseExamples}
        </examples>`
      : dedent`
        <examples>
        ${baseExamples}
        </examples>`;

  return dedent`
    <task>
    Generate a short ${entityName} title from the user's message.
    ${contextSection}
    </task>

    <context>
    Current time: ${timeContext}
    </context>

    <important>
    You are ONLY extracting a title from the user's message. Do NOT answer questions, perform tasks, or provide information.
    The user's message is input to summarize - not a request for you to respond to.
    The user may be asking a question, requesting help, or wanting to build an app. Name the ${entityName} based on what they're asking for.
    If the user has attached files, use the file types and names to inform the title (e.g., .xlsx → Spreadsheet, .pdf → Document, .csv → Data, .jpg/.png → Image).
    If you cannot determine a meaningful title from the content, create a friendly fallback using the current time (${timeContext}), e.g. "${timeContext} ${entityName}" or "Late night help".
    </important>

    <rules>
    - Maximum ${MAX_TITLE_WORDS} words
    - Single line only
    - Use sentence case (capitalize only the first word, except for proper nouns)
    - Avoid using words like "project", "chat", or "conversation" in the title
    - If files are attached, incorporate the file type or purpose into the title
    - Return ONLY the title text in plain text format
    - No markdown, quotes, code fences, or formatting
    - No prefixes or labels like "Title:" or "Name:"
    </rules>

    ${examples}
  `.trim();
}

function generateTitle({
  message,
  model,
  templateTitle,
  type,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  templateTitle?: string;
  type: TitleType;
}) {
  return ResultAsync.fromPromise(
    (async () => {
      const userMessage = textForMessage(message, { includeFileNames: true });
      if (!userMessage.trim()) {
        throw new Error("No user message");
      }

      const title = await generateText({
        model,
        prompt: userMessage,
        system: buildSystemPrompt(type, templateTitle),
      });

      if (!title.text.trim()) {
        throw new Error("No title generated");
      }

      let cleanedTitle = title.text.trim();

      cleanedTitle = cleanedTitle.replaceAll(/```[\s\S]*?```/g, "");
      cleanedTitle = cleanedTitle.replaceAll(/```[^\n]*/g, "");
      cleanedTitle = cleanedTitle.replaceAll(/^[#\-=*_]+\s*/gm, "");
      cleanedTitle = cleanedTitle.replaceAll(
        /[\u2500-\u257F\u2580-\u259F]/g,
        "",
      );
      cleanedTitle = cleanedTitle.replaceAll(/^["'`]+|["'`]+$/g, "");
      cleanedTitle = cleanedTitle.replace(
        /^\s*(?:title|name|project|app):\s*/i,
        "",
      );
      cleanedTitle = cleanedTitle.trim();
      cleanedTitle = cleanedTitle.split("\n")[0]?.trim() ?? "";

      const words = cleanedTitle.split(/\s+/).filter(Boolean);
      const limitedTitle = words.slice(0, MAX_TITLE_WORDS).join(" ");

      return (
        limitedTitle ||
        `${getTimeContext()} ${type === "project" ? "Project" : "chat"}`
      );
    })(),
    (error: unknown) => ({
      message: `Failed to generate ${type} title: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );
}

function getTimeContext(): string {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const hour = now.getHours();

  let timeOfDay: string;
  if (hour < 12) {
    timeOfDay = "morning";
  } else if (hour < 17) {
    timeOfDay = "afternoon";
  } else if (hour < 21) {
    timeOfDay = "evening";
  } else {
    timeOfDay = "night";
  }

  return `${dayName} ${timeOfDay}`;
}
