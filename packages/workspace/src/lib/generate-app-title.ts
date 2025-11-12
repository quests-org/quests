import { generateText } from "ai";
import { type LanguageModel } from "ai";
import { ResultAsync } from "neverthrow";
import { dedent } from "radashi";

import { type SessionMessage } from "../schemas/session/message";
import { textForMessage } from "./text-for-message";

const MAX_TITLE_WORDS = 5;

export function generateAppTitle({
  message,
  model,
  templateTitle,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  templateTitle?: string;
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
        system: buildSystemPrompt(templateTitle),
      });

      if (!title.text.trim()) {
        throw new Error("No title generated");
      }

      let cleanedTitle = title.text.trim();
      // remove markdown headers
      cleanedTitle = cleanedTitle.replace(/^#+\s*/, "");
      cleanedTitle = cleanedTitle.trim();

      const words = cleanedTitle.split(/\s+/);
      const limitedTitle = words.slice(0, MAX_TITLE_WORDS).join(" ");

      return limitedTitle;
    })(),
    (error: unknown) => ({
      message: `Failed to generate project title: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );
}

function buildSystemPrompt(templateTitle?: string): string {
  const contextSection = templateTitle
    ? `<context>
    You are generating a title for an app.
    The app is based on the "${templateTitle}" template.
    </context>`
    : `<context>
    You are generating a title for an app.
    </context>`;

  return dedent`<task>
    Generate a project title from the user message.
    </task>

    ${contextSection}

    <rules>
    - Maximum ${MAX_TITLE_WORDS} words, single line
    - Do not use the word "app", "project", or anything other than a descriptive title for the functionality
    - Return ONLY the title text in plain text format
    - No markdown, no quotes, no formatting, no extra details
    - Just the plain title words, nothing else
    - Keep it concise and descriptive
    </rules>

    <examples>
    Build a todo app → Todos
    Create a chat application with file uploads → Chat with Files
    Make a kanban board for project management → Kanban Board
    Build a complex inventory management system → Inventory Management System
    </examples>
  `.trim();
}
