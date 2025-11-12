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
  const contextSection =
    type === "project" && templateTitle
      ? `<context>
    You are generating a title for an app.
    The app is based on the "${templateTitle}" template.
    </context>`
      : type === "project"
        ? `<context>
    You are generating a title for an app.
    </context>`
        : `<context>
    You are generating a title for a chat conversation.
    </context>`;

  const taskDescription =
    type === "project"
      ? "Generate a project title from the user message."
      : "Generate a concise chat title from the user message.";

  const examples =
    type === "project"
      ? `<examples>
    Build a todo app → Todos
    Create a chat application with file uploads → Chat with Files
    Make a kanban board for project management → Kanban Board
    Build a complex inventory management system → Inventory Management System
    </examples>`
      : `<examples>
    What is the weather like today? → Weather inquiry
    Help me debug this Python code → Python debugging help
    Explain quantum computing → Quantum computing explanation
    How do I make lasagna? → Lasagna recipe
    </examples>`;

  const capitalizationRule =
    type === "project"
      ? "- Use Title Case for project names"
      : "- Use sentence case (capitalize only the first word)";

  return dedent`<task>
    ${taskDescription}
    </task>

    ${contextSection}

    <rules>
    - Maximum ${MAX_TITLE_WORDS} words, single line
    - Do not use the word "app", "project", "chat", "conversation", or anything other than a descriptive title for the content
    - Return ONLY the title text in plain text format
    - No markdown, no quotes, no formatting, no extra details, no code fences, no ASCII art, no diagrams
    - Do not include any prefixes, labels, or explanations
    - Just the plain title words, nothing else
    - Keep it concise and descriptive
    ${capitalizationRule}
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
      const userMessage = textForMessage(message);
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

      return limitedTitle;
    })(),
    (error: unknown) => ({
      message: `Failed to generate ${type} title: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );
}
