import { generateText } from "ai";
import { type LanguageModel } from "ai";
import { ResultAsync } from "neverthrow";
import { dedent } from "radashi";

import { type SessionMessage } from "../schemas/session/message";
import { textForMessage } from "./text-for-message";

const MAX_TITLE_WORDS = 5;

const SYSTEM_PROMPT = dedent`<task>
    Generate a project title from the user message.
    </task>

    <context>
    You are generating a title for an app.
    </context>

    <rules>
    - Maximum ${MAX_TITLE_WORDS} words, single line
    - Do not use the word "app", "project", or anything other than a descriptive title for the functionality
    - Return ONLY the title text, nothing else
    - Keep it concise and descriptive
    </rules>

    <examples>
    "Build a todo app" → "Todos"
    "Create a chat application with file uploads" → "Chat with Files"
    "Make a kanban board for project management" → "Kanban Board"
    "Build a complex inventory management system" → "Inventory Management System"
    </examples>
  `.trim();

export function generateProjectTitle({
  message,
  model,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
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
        system: SYSTEM_PROMPT,
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
